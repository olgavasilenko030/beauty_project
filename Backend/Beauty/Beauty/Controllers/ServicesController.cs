using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Beauty.Models;
using Microsoft.AspNetCore.Authorization;

namespace Beauty.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ServicesController : ControllerBase
    {
        private readonly BeautySalonContext _context;

        public ServicesController(BeautySalonContext context)
        {
            _context = context;
        }

        // GET: api/Services
        // GET: api/Services или api/Services?employeeId=5 или api/Services?businessId=1
        [HttpGet]
        [AllowAnonymous] 
        public async Task<ActionResult<IEnumerable<object>>> GetServices([FromQuery] int? businessId, [FromQuery] int? employeeId)
        {
            var query = _context.Services.AsQueryable();

            // 1. Фильтр по мастеру (для записи к конкретному человеку)
            if (employeeId.HasValue)
            {
                query = query.Where(s => s.EmploeeId == employeeId.Value);
            }
            // 2. Фильтр по бизнесу (общий прайс салона)
            else if (businessId.HasValue)
            {
                query = query.Where(s => s.BusinessId == businessId.Value);
            }

            // 3. ИСПРАВЛЕНО: Формируем плоский JSON (DTO) без циклических ссылок и отдаем фронтенду
            var result = await query.Select(s => new
            {
                s.Id,
                s.Name,
                s.Price,
                // Переводим TimeSpan длительности в понятную для JS строку формата "ЧЧ:мм"
                Duration = s.Duration.ToString(@"hh\:mm"),
                s.EmploeeId,
                s.BusinessId
            }).ToListAsync();

            return Ok(result);
        }


        // --- УЛУЧШЕНО: PUT с авторизацией и понятными ответами ---
        // PUT: api/Services/5
        [HttpPut("{id}")]
        [Authorize(Roles = "Owner,Admin")] // Менять прайс может только бизнес
        public async Task<IActionResult> PutService(int id, [FromBody] Service service)
        {
            if (id != service.Id)
            {
                return BadRequest("Идентификатор услуги не совпадает.");
            }

            // 1. ИСПРАВЛЕНО: Сначала находим реальную услугу из базы данных со всеми связями
            var existingService = await _context.Services.FindAsync(id);
            if (existingService == null)
            {
                return NotFound("Услуга для обновления не найдена в системе.");
            }

            // 2. ИСПРАВЛЕНО: Обновляем только изменённые поля формы, не затирая связи мастера!
            existingService.Name = service.Name;
            existingService.Price = service.Price;
            existingService.Duration = service.Duration;

            // Если фронтенд передал новые ID, бережно обновляем их, страхуясь от null
            if (service.EmploeeId > 0) existingService.EmploeeId = service.EmploeeId;
            if (service.BusinessId > 0) existingService.BusinessId = service.BusinessId;

            _context.Entry(existingService).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { message = "Услуга успешно обновлена в прайс-листе" });
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ServiceExists(id))
                {
                    return NotFound("Услуга для обновления не найдена.");
                }
                else
                {
                    throw;
                }
            }
        }


        // POST: api/Services
        [HttpPost]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<ActionResult<Service>> PostService(Service service)
        {
            try
            {
                _context.Services.Add(service);
                await _context.SaveChangesAsync();
                return Ok(service);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine(ex.Message);
                return BadRequest("Ошибка базы данных: " + ex.Message);
            }
        }

        // --- УЛУЧШЕНО: DELETE с каскадной проверкой активных записей ---
        // DELETE: api/Services/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> DeleteService(int id)
        {
            var service = await _context.Services.FindAsync(id);
            if (service == null)
            {
                return NotFound("Услуга не найдена в системе.");
            }

            // ПРОВЕРКА ЦЕЛОСТНОСТИ: Запрещаем удалять услугу, если к ней привязаны активные записи клиентов
            bool hasRecordings = await _context.Recordings.AnyAsync(r => r.ServiceId == id && r.Status != "Cancelled");
            if (hasRecordings)
            {
                return BadRequest("Нельзя удалить услугу, так как на неё есть незавершенные записи клиентов.");
            }

            _context.Services.Remove(service);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Услуга успешно удалена из прайс-листа" });
        }

        private bool ServiceExists(int id)
        {
            return _context.Services.Any(e => e.Id == id);
        }
    }
}
