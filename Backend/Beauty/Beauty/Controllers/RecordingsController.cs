using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Beauty.Models;
using Microsoft.AspNetCore.Authorization;
using Beauty.Services; // Connect service references

namespace Beauty.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RecordingsController : ControllerBase
    {
        private readonly BeautySalonContext _context;
        private readonly Beauty.Services.EmailService _emailService; // ДОБАВЛЕНО: Ссылка на сервис отправки почты

        // ИСПРАВЛЕНО: Теперь конструктор принимает и базу данных, и почтовый сервис для отправки писем клиентам!
        public RecordingsController(BeautySalonContext context, Beauty.Services.EmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        // GET: api/Recordings (СОХРАНЕНО: Твой метод просмотра журнала записей мастерами и админом)
        [HttpGet]
        [Authorize]
        public async Task<ActionResult<IEnumerable<Recording>>> GetRecordings()
        {
            return await _context.Recordings
                .AsNoTracking()
                .Include(r => r.Client)
                .Include(r => r.Emploee)
                .Include(r => r.Service)
                .OrderBy(r => r.AppointmentTime)
                .ToListAsync();
        }



        // GET: api/Recordings/5
        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<Recording>> GetRecording(int id)
        {
            var recording = await _context.Recordings.FindAsync(id);
            if (recording == null) return NotFound();
            return recording;
        }

        // --- ГЕНЕРАЦИЯ ТАЙМСЛОТОВ БЕЗ UTC СДВИГОВ ---
        // --- DYNAMIC SLOT GENERATION WITH WORK HOURS, ACTIVE DAYS, AND DURATION GUARDS ---
        // GET: api/Recordings/slots?masterId=1&serviceId=2&date=2026-05-15
        [HttpGet("slots")]
        [Authorize]
        public async Task<IActionResult> GetAvailableSlots([FromQuery] int masterId, [FromQuery] int serviceId, [FromQuery] DateTime date)
        {
            var service = await _context.Services.FindAsync(serviceId);
            if (service == null) return BadRequest("Указанная услуга не найдена.");

            var employee = await _context.Emploees.FindAsync(masterId);
            if (employee == null) return BadRequest("Мастер не найден.");

            var business = await _context.Businesses.FindAsync(employee.BusinessId);
            if (business == null) return BadRequest("Салон красоты не найден.");

            // Use the pure localized date from the request calendar picker
            var targetDate = date.Date;

            // 1. FILTER OPERATIONAL WEEKDAYS (Admin checkbox sync)
            string[] daysOfWeekRu = { "Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб" };
            string targetDayName = daysOfWeekRu[(int)targetDate.DayOfWeek];

            if (business.WorkingDays != null && business.WorkingDays.Count > 0)
            {
                if (!business.WorkingDays.Contains(targetDayName))
                {
                    return Ok(new List<string>()); // Lock out day-off intervals instantly
                }
            }

            // 2. DYNAMIC HOURS INTERVAL PARSING (Format: "09:00 - 21:00")
            int startHour = 9;
            int startMinute = 0;
            int endHour = 21;
            int endMinute = 0;

            if (!string.IsNullOrEmpty(business.WorkingHours) && business.WorkingHours.Contains(" - "))
            {
                try
                {
                    var mainParts = business.WorkingHours.Split(" - ");
                    var startParts = mainParts[0].Split(':');
                    var endParts = mainParts[1].Split(':');

                    startHour = int.Parse(startParts[0]);
                    startMinute = int.Parse(startParts[1]);
                    endHour = int.Parse(endParts[0]);
                    endMinute = int.Parse(endParts[1]);
                }
                catch
                {
                    // Fallback to strict industry parameters if parsing fails
                    startHour = 9; startMinute = 0;
                    endHour = 21; endMinute = 0;
                }
            }

            var dayStart = targetDate.AddHours(startHour).AddMinutes(startMinute);
            var dayEnd = targetDate.AddHours(endHour).AddMinutes(endMinute);

            // 3. FETCH COLLIDING APPOINTMENTS FOR THE DAY
            var existingRecordings = await _context.Recordings
                .Where(r => r.EmploeeId == masterId
                            && r.Status != "Cancelled"
                            && r.AppointmentTime >= targetDate
                            && r.AppointmentTime < targetDate.AddDays(1))
                .Include(r => r.Service)
                .AsNoTracking()
                .ToListAsync();

            var availableSlots = new List<string>();
            var currentSlot = dayStart;

            // 4. GENERATE STEP SLOTS SAFE AGAINST DURATION OVERFLOW
            while (currentSlot <= dayEnd)
            {
                // Calculate exact session completion timestamp
                var sessionEnd = currentSlot.Add(service.Duration);

                // DURATION GUARD CRITICAL CHECK: If the service ends past closing time, block it!
                if (sessionEnd > dayEnd)
                {
                    break; // Terminate cycle completely since subsequent windows will overflow further
                }

                // Append the master's buffer rest parameter for intersection mapping
                var neededDuration = service.Duration + (service.BreakAfterRecording ?? TimeSpan.Zero);
                var slotEndWithBreak = currentSlot.Add(neededDuration);

                bool isIntersect = existingRecordings.Any(r =>
                    currentSlot < r.AppointmentTime.Add(r.Service!.Duration + (r.Service.BreakAfterRecording ?? TimeSpan.Zero)) &&
                    slotEndWithBreak > r.AppointmentTime
                );

                // Compare exclusively using localized server time parameters
                if (!isIntersect && currentSlot > DateTime.Now)
                {
                    availableSlots.Add(currentSlot.ToString("HH:mm"));
                }

                // Increment index bounds by standard 30-minute grids
                currentSlot = currentSlot.AddMinutes(30);
            }

            return Ok(availableSlots);
        }

        [HttpGet("my-history")]
        [Authorize] // ИСПРАВЛЕНО: Вернули полноценный Authorize, теперь Claim не будет пустым!
        public async Task<IActionResult> GetMyRecordings()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim)) return Unauthorized();

            var user = await _context.Users.FindAsync(int.Parse(userIdClaim));
            if (user == null) return Unauthorized();

            // 1. Скачиваем записи из PostgreSQL со всеми INNER JOIN связями
            var dbRecordings = await _context.Recordings
                .Include(r => r.Emploee)
                    .ThenInclude(e => e.Business)
                .Include(r => r.Service)
                .Where(r => r.ClientId == user.LinkedId)
                .OrderByDescending(r => r.AppointmentTime)
                .ToListAsync();

            // 2. Безопасно мапим анонимный JSON-объект в оперативной памяти сервера (.AsEnumerable)
            var result = dbRecordings.AsEnumerable().Select(r => new
            {
                r.Id,
                AppointmentTime = r.AppointmentTime.ToString("dd.MM.yyyy HH:mm"),
                MasterName = r.Emploee != null ? $"{r.Emploee.Name} {r.Emploee.Surname}".Trim() : "Мастер",
                ServiceName = r.Service?.Name ?? "Процедура",
                Price = r.Service?.Price ?? 0,
                Status = r.Status,
                SalonName = r.Emploee?.Business?.Name ?? "Салон красоты BEAUTY HUB"
            }).ToList();

            return Ok(result);
        }


        // --- ДЛЯ МАСТЕРА: Получить его расписание ---
        [HttpGet("ForMaster/{masterId}")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<Recording>>> GetMasterRecordings(int masterId)
        {
            return await _context.Recordings
                .AsNoTracking()
                .Where(r => r.EmploeeId == masterId)
                .Include(r => r.Client)
                .Include(r => r.Service)
                .OrderBy(r => r.AppointmentTime)
                .ToListAsync();
        }

        // --- ДЛЯ КЛИЕНТА: Получить его историю записей с названиями салонов красоты ---
        // GET: api/Recordings/ForClient/5
        [HttpGet("ForClient/{clientId}")]
        [Authorize] // Оставляем авторизацию, теперь она отработает идеально!
        public async Task<IActionResult> GetClientRecordings(int clientId)
        {
            if (clientId == 0) return BadRequest("Идентификатор клиента не указан.");

            try
            {
                // 1. ИСПРАВЛЕНО: Добавили цепочку .ThenInclude(e => e.Business) для выгрузки данных салона из PostgreSQL!
                var dbRecordings = await _context.Recordings
                    .AsNoTracking()
                    .Where(r => r.ClientId == clientId)
                    .Include(r => r.Emploee)
                        .ThenInclude(e => e.Business) // Подключаем таблицу салонов сети!
                    .Include(r => r.Service)
                    .OrderByDescending(r => r.AppointmentTime)
                    .ToListAsync();

                if (!dbRecordings.Any())
                {
                    return Ok(new List<object>());
                }

                // 2. ИСПРАВЛЕНО: Форматируем анонимный объект в памяти сервера (.AsEnumerable), чтобы даты не ломали PostgreSQL!
                var result = dbRecordings.AsEnumerable().Select(r => new
                {
                    r.Id,
                    // Форматируем дату под твой фронтенд
                    AppointmentTime = r.AppointmentTime.ToString("dd.MM.yyyy HH:mm"),
                    MasterName = r.Emploee != null ? $"{r.Emploee.Name} {r.Emploee.Surname}".Trim() : "Мастер",
                    ServiceName = r.Service?.Name ?? "Процедура",
                    Price = r.Service?.Price ?? 0,
                    Status = r.Status,
                    // Вытаскиваем реальное название салона из базы!
                    SalonName = r.Emploee?.Business?.Name ?? "Салон красоты BEAUTY HUB"
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[CRM ERROR] Ошибка истории в ForClient: {ex.Message}");
                return StatusCode(500, "Внутренняя ошибка сервера при компиляции истории визитов: " + ex.Message);
            }
        }


        // POST: api/Recordings
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<Recording>> PostRecording(Recording recording)
        {
            // 1. Жёсткая проверка на существование клиента (защита от удалений через pgAdmin)
            var client = await _context.Clients.AsNoTracking().FirstOrDefaultAsync(c => c.Id == recording.ClientId);
            if (client == null)
            {
                return BadRequest("Выбранный клиент не найден в базе CRM. Возможно, он был удален. Перезагрузите страницу.");
            }

            if (client.IsBlocked)
            {
                return BadRequest("Запись невозможна. Профиль клиента заблокирован администрацией салона.");
            }

            var service = await _context.Services.FindAsync(recording.ServiceId);
            if (service == null) return BadRequest("Услуга не найдена");

            var newStart = recording.AppointmentTime;
            var neededDuration = service.Duration + (service.BreakAfterRecording ?? TimeSpan.Zero);
            var newEnd = newStart.Add(neededDuration);

            var dayStart = newStart.Date;
            var dayEnd = dayStart.AddDays(1);

            // Безопасно получаем записи на день без лишних инклудов
            var singleDayRecordings = await _context.Recordings
                .Where(r => r.Status != "Cancelled"
                            && r.AppointmentTime >= dayStart
                            && r.AppointmentTime < dayEnd)
                .Include(r => r.Service)
                .AsNoTracking()
                .ToListAsync();

            // Проверяем, свободен ли мастер
            bool isMasterBusy = singleDayRecordings.Any(r =>
                r.EmploeeId == recording.EmploeeId &&
                newStart < r.AppointmentTime.Add(r.Service!.Duration + (r.Service.BreakAfterRecording ?? TimeSpan.Zero)) &&
                newEnd > r.AppointmentTime
            );

            if (isMasterBusy)
            {
                return BadRequest("Выбранный временной слот уже занят другим клиентом.");
            }

            // Проверяем, свободен ли сам клиент в это время
            bool isClientBusy = singleDayRecordings.Any(r =>
                r.ClientId == recording.ClientId &&
                r.Service != null &&
                newStart < r.AppointmentTime.Add(r.Service.Duration) &&
                newEnd > r.AppointmentTime
            );

            if (isClientBusy)
            {
                return BadRequest("В это время данный клиент уже записан на другую процедуру у другого мастера.");
            }

            recording.AppointmentTime = newStart;
            recording.Status = "Scheduled";

            try
            {
                _context.Recordings.Add(recording);
                await _context.SaveChangesAsync();

                // ==========================================
                // ИСПРАВЛЕНО: ИНТЕГРАЦИЯ АВТОМАТИЧЕСКОЙ ОТПРАВКИ EMAIL КЛИЕНТУ!
                // ==========================================
                // 1. Вытягиваем из базы связанные данные для подстановки в HTML-шаблон письма
                var employee = await _context.Emploees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == recording.EmploeeId);
                var business = await _context.Businesses.AsNoTracking().FirstOrDefaultAsync(b => b.Id == (employee != null ? employee.BusinessId : 0));

                // 2. Ищем почту клиента в таблице users по linked_id (который равен ClientId)
                var userAccount = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Role == "Client" && u.LinkedId == recording.ClientId);

                if (userAccount != null && !string.IsNullOrEmpty(userAccount.Email))
                {
                    // Запускаем отправку в фоновом потоке, чтобы фронтенд React не зависал в ожидании ответа от Mail.ru/Yandex
                    _ = Task.Run(async () =>
                    {
                        await _emailService.SendBookingConfirmationAsync(
                            toEmail: userAccount.Email, // Шлём на реальную почту авторизованного клиента!
                            clientName: client?.Name ?? "Клиент",
                            salonName: business?.Name ?? "Наш бьюти-салон",
                            masterName: employee?.Name ?? "Специалист",
                            serviceName: service?.Name ?? "Процедура",
                            appointmentTime: recording.AppointmentTime,
                            salonAddress: business?.Address ?? "Указанный адрес филиала"
                        );
                    });
                }
                else
                {
                    Console.WriteLine($"[CRM NOTICE] Отправка пропущена: у клиента с ID {recording.ClientId} не заполнено поле Email в таблице users.");
                }
                // ==========================================
            }
            catch (Exception ex)
            {
                return BadRequest($"Ошибка базы данных при сохранении записи: {ex.InnerException?.Message ?? ex.Message}");
            }

            return CreatedAtAction("GetRecording", new { id = recording.Id }, recording);
        }



        // PUT: api/Recordings/5
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutRecording(int id, Recording recording)
        {
            if (id != recording.Id) return BadRequest("Идентификатор не совпадает.");

            var existing = await _context.Recordings.FindAsync(id);
            if (existing == null) return NotFound("Запись для изменения не найдена в системе.");

            existing.ClientId = recording.ClientId;
            existing.ServiceId = recording.ServiceId;

            // ИСПРАВЛЕНО: Записываем время напрямую "цифра в цифру" без конвертации в UTC
            existing.AppointmentTime = recording.AppointmentTime;
            existing.Status = recording.Status;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!RecordingExists(id)) return NotFound();
                throw;
            }

            return NoContent();
        }

        // PATCH: api/Recordings/Complete/5
        [HttpPatch("Complete/{id}")]
        [Authorize(Roles = "Master,Owner,Admin")]
        public async Task<IActionResult> CompleteRecording(int id)
        {
            var recording = await _context.Recordings.FindAsync(id);
            if (recording == null) return NotFound("Запись не найдена в CRM.");

            recording.Status = "Completed";

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { message = "Визит успешно завершен. Услуга оказана." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Ошибка сервера при обновлении статуса: " + ex.Message);
            }
        }

        // PATCH: api/Recordings/Cancel/5
        [HttpPatch("Cancel/{id}")]
        [Authorize]
        public async Task<IActionResult> CancelRecording(int id)
        {
            var recording = await _context.Recordings.FindAsync(id);
            if (recording == null) return NotFound("Запись не найдена");

            recording.Status = "Cancelled";

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { message = "Запись успешно отменена" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Ошибка при отмене: " + ex.Message);
            }
        }

        // DELETE: api/Recordings/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> DeleteRecording(int id)
        {
            var recording = await _context.Recordings.FindAsync(id);
            if (recording == null) return NotFound();

            _context.Recordings.Remove(recording);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool RecordingExists(int id)
        {
            return _context.Recordings.Any(e => e.Id == id);
        }
    }
}
