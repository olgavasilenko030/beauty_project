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
    public class ClientsController : ControllerBase
    {
        private readonly BeautySalonContext _context;

        public ClientsController(BeautySalonContext context)
        {
            _context = context;
        }

        // --- УМНЫЙ ИБЕЗОПАСНЫЙ GET С ФИЛЬТРАЦИЕЙ КЛИЕНТОВ САЛОНА ---
        // GET: api/Clients или api/Clients?businessId=1
        [HttpGet]
        [Authorize] // Доступно авторизованным администраторам и владельцам филиала
        public async Task<IActionResult> GetClients([FromQuery] int businessId)
        {
            if (businessId == 0) return BadRequest("Идентификатор бизнеса не указан.");

            try
            {
                // 1. Безопасный INNER JOIN таблиц с явным приведением nullable-полей (int?) к типам значений (.Value)
                var clientIdsInBusiness = await (from r in _context.Recordings
                                                 join e in _context.Emploees on r.EmploeeId equals e.Id
                                                 where e.BusinessId == businessId && r.ClientId.HasValue
                                                 select r.ClientId.Value)
                                                 .Distinct() // Исключаем дубликаты ID клиентов визитов
                                                 .ToListAsync();

                // 2. Если салон новый и записей клиентов в штате нет, сразу отдаем пустой массив, минуя лишний запрос к Postgres
                if (!clientIdsInBusiness.Any())
                {
                    return Ok(new List<object>());
                }

                // 3. Выгружаем плоские карточки только привязанных к салону клиентов
                var filteredClients = await _context.Clients
                    .AsNoTracking()
                    .Where(c => clientIdsInBusiness.Contains(c.Id))
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.Surname,
                        c.IsBlocked,
                        c.Notes,
                        // Безопасно вытаскиваем Email авторизационного аккаунта
                        Email = _context.Users
                            .Where(u => u.Role == "Client" && u.LinkedId == c.Id)
                            .Select(u => u.Email)
                            .FirstOrDefault() ?? "Email не привязан"
                    })
                    .ToListAsync();

                return Ok(filteredClients);
            }
            catch (Exception ex)
            {
                // Пишет подробный отчет с ошибкой синтаксиса в окно Вывода (Output) Visual Studio
                System.Diagnostics.Debug.WriteLine($"КРИТИЧЕСКАЯ ОШИБКА БАЗЫ КЛИЕНТОВ: {ex.Message}");
                return StatusCode(500, "Внутренняя ошибка сервера при фильтрации базы клиентов: " + ex.Message);
            }
        }

        // GET: api/Clients/5
        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<Client>> GetClient(int id)
        {
            var client = await _context.Clients.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);

            if (client == null)
            {
                return NotFound("Клиент не найден.");
            }

            return client;
        }

        // --- УПРАВЛЕНИЕ ЧЕРНЫМ СПИСКОМ КЛИЕНТОВ (PATCH) ---
        // PATCH: api/Clients/ToggleBlock/5
        [HttpPatch("ToggleBlock/{id}")]
        [Authorize]
        public async Task<IActionResult> ToggleBlockClient(int id)
        {
            var client = await _context.Clients.FindAsync(id);
            if (client == null) return NotFound("Клиент не найден в базе данных.");

            // Инвертируем флаг блокировки в карточке
            client.IsBlocked = !client.IsBlocked;

            try
            {
                _context.Entry(client).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = client.IsBlocked ? "Клиент успешно добавлен в черный список." : "Клиент успешно разблокирован.",
                    isBlocked = client.IsBlocked
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Ошибка при изменении статуса блокировки клиента: " + ex.Message);
            }
        }

        // PUT: api/Clients/5
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutClient(int id, Client client)
        {
            if (id != client.Id)
            {
                return BadRequest("Идентификатор клиента не совпадает.");
            }

            _context.Entry(client).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ClientExists(id))
                {
                    return NotFound("Данные клиента для обновления не найдены.");
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/Clients
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<Client>> PostClient(Client client)
        {
            _context.Clients.Add(client);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetClient), new { id = client.Id }, client);
        }

        // DELETE: api/Clients/5
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteClient(int id)
        {
            var client = await _context.Clients.FindAsync(id);
            if (client == null)
            {
                return NotFound("Клиент для удаления не найден.");
            }

            // ПРОВЕРКА ЦЕЛОСТНОСТИ: Блокируем удаление, если за клиентом закреплены сеансы
            bool hasRecordings = await _context.Recordings.AnyAsync(r => r.ClientId == id);
            if (hasRecordings)
            {
                return BadRequest("Невозможно удалить карточку клиента, так как в базе данных зафиксирована история его записей.");
            }

            _context.Clients.Remove(client);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool ClientExists(int id)
        {
            return _context.Clients.Any(e => e.Id == id);
        }
    }
}
