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
        [Authorize(Roles = "Owner,Admin")]
        public async Task<ActionResult<IEnumerable<Recording>>> GetRecordings()
        {
            return await _context.Recordings.AsNoTracking().ToListAsync();
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

        // --- ДИНАМИЧЕСКАЯ ГЕНЕРАЦИЯ ТАЙМСЛОТОВ ДЛЯ КЛИЕНТА ---
        // GET: api/Recordings/slots?masterId=1&serviceId=2&date=2026-05-15
        [HttpGet("slots")]
        [Authorize]
        public async Task<IActionResult> GetAvailableSlots([FromQuery] int masterId, [FromQuery] int serviceId, [FromQuery] DateTime date)
        {
            var service = await _context.Services.FindAsync(serviceId);
            if (service == null) return BadRequest("Указанная услуга не найдена.");

            var targetDate = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);

            var dayStart = targetDate.AddHours(9);
            var dayEnd = targetDate.AddHours(21);

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

            var neededDuration = service.Duration + (service.BreakAfterRecording ?? TimeSpan.Zero);

            while (currentSlot + service.Duration <= dayEnd)
            {
                var slotEnd = currentSlot.Add(neededDuration);

                bool isIntersect = existingRecordings.Any(r =>
                    currentSlot < r.AppointmentTime.Add(r.Service.Duration + (r.Service.BreakAfterRecording ?? TimeSpan.Zero)) &&
                    slotEnd > r.AppointmentTime
                );

                if (!isIntersect && currentSlot > DateTime.UtcNow)
                {
                    availableSlots.Add(currentSlot.ToString("HH:mm"));
                }

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
            // --- ИСПРАВЛЕНО: Жесткая проверка Черного списка перед созданием брони ---
            var client = await _context.Clients.AsNoTracking().FirstOrDefaultAsync(c => c.Id == recording.ClientId);
            if (client != null && client.IsBlocked)
            {
                return BadRequest("Запись невозможна. Ваш профиль заблокирован администрацией салона.");
            }

            var service = await _context.Services.FindAsync(recording.ServiceId);
            if (service == null) return BadRequest("Услуга не найдена");

            var newStart = DateTime.SpecifyKind(recording.AppointmentTime, DateTimeKind.Utc);
            var neededDuration = service.Duration + (service.BreakAfterRecording ?? TimeSpan.Zero);
            var newEnd = newStart.Add(neededDuration);

            var dayStart = newStart.Date;
            var dayEnd = dayStart.AddDays(1);

            var singleDayRecordings = await _context.Recordings
                .Where(r => r.EmploeeId == recording.EmploeeId
                            && r.Status != "Cancelled"
                            && r.AppointmentTime >= dayStart
                            && r.AppointmentTime < dayEnd)
                .Include(r => r.Service)
                .AsNoTracking()
                .ToListAsync();

            bool isBusy = singleDayRecordings.Any(r =>
                newStart < r.AppointmentTime.Add(r.Service.Duration + (r.Service.BreakAfterRecording ?? TimeSpan.Zero)) &&
                newEnd > r.AppointmentTime
            );

            if (isBusy)
            {
                return BadRequest("Выбранный временной слот уже занят другим клиентом.");
            }

            recording.AppointmentTime = newStart;
            recording.Status = "Scheduled";

            _context.Recordings.Add(recording);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetRecording", new { id = recording.Id }, recording);
        }

        // PUT: api/Recordings/5
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutRecording(int id, Recording recording)
        {
            if (id != recording.Id) return BadRequest("Идентификатор не совпадает.");

            recording.AppointmentTime = DateTime.SpecifyKind(recording.AppointmentTime, DateTimeKind.Utc);
            _context.Entry(recording).State = EntityState.Modified;

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

        // --- ИЗМЕНЕНИЕ СТАТУСА МАСТЕРОМ НА «ВЫПОЛНЕНО» (ИСПРАВЛЕНО И ДОПИСАНО) ---
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
