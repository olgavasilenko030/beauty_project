using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Beauty.Models;
using Microsoft.AspNetCore.Authorization;

namespace Beauty.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RecordingsController : ControllerBase
    {
        private readonly BeautySalonContext _context;

        public RecordingsController(BeautySalonContext context)
        {
            _context = context;
        }

       
        // GET: api/Recordings
        [HttpGet]
        [Authorize] // Позволяет админу и мастерам просматривать журнал
        public async Task<ActionResult<IEnumerable<Recording>>> GetRecordings()
        {
            return await _context.Recordings
                .AsNoTracking()
                .Include(r => r.Client)   // Вытягиваем имя и телефон клиента
                .Include(r => r.Emploee) // Вытягиваем мастера, к которому записаны
                .Include(r => r.Service) // Вытягиваем цену и длительность процедуры
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

        // --- ДЛЯ КЛИЕНТА: Получить его историю записей ---
        [HttpGet("ForClient/{clientId}")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<Recording>>> GetClientRecordings(int clientId)
        {
            return await _context.Recordings
                .AsNoTracking()
                .Where(r => r.ClientId == clientId)
                .Include(r => r.Emploee)
                .Include(r => r.Service)
                .OrderByDescending(r => r.AppointmentTime)
                .ToListAsync();
        }

        // POST: api/Recordings
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<Recording>> PostRecording(Recording recording)
        {
            // 1. ИСПРАВЛЕНО: Жёсткая проверка на существование клиента (защита от удалений через pgAdmin)
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

            // Безопасно получаем записи на день без лишних инклудов, чтобы не падать из-за старых битых данных
            var singleDayRecordings = await _context.Recordings
                .Where(r => r.Status != "Cancelled"
                            && r.AppointmentTime >= dayStart
                            && r.AppointmentTime < dayEnd)
                .Include(r => r.Service)
                .AsNoTracking()
                .ToListAsync();

            // 1. Проверяем, свободен ли мастер
            bool isMasterBusy = singleDayRecordings.Any(r =>
                r.EmploeeId == recording.EmploeeId &&
                newStart < r.AppointmentTime.Add(r.Service!.Duration + (r.Service.BreakAfterRecording ?? TimeSpan.Zero)) &&
                newEnd > r.AppointmentTime
            );

            if (isMasterBusy)
            {
                return BadRequest("Выбранный временной слот уже занят другим клиентом.");
            }

            // 2. Проверяем, свободен ли сам клиент в это время
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

            // 2. ИСПРАВЛЕНО: Заворачиваем сохранение в try-catch, чтобы поймать скрытые ошибки базы данных
            try
            {
                _context.Recordings.Add(recording);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Если база данных ругается на связи (например, указан неверный MasterId/ClientId), мы увидим это на фронтенде
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
