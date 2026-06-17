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
        [Authorize]
        public async Task<IActionResult> GetClients([FromQuery] int businessId)
        {
            if (businessId == 0) return BadRequest("Идентификатор бизнеса не указан.");

            try
            {
                // 1. Находим ID всех клиентов, у которых есть визиты в этот конкретный салон
                var clientIdsInBusiness = await (from r in _context.Recordings
                                                 join e in _context.Emploees on r.EmploeeId equals e.Id
                                                 where e.BusinessId == businessId && r.ClientId.HasValue
                                                 select r.ClientId.Value)
                                                 .Distinct()
                                                 .ToListAsync();

                // 2. ИСПРАВЛЕНО: Скачиваем клиентов из таблицы public.client.
                // Вытаскиваем тех, у кого есть визиты, ИЛИ новых "ручных" клиентов салона (у них Фамилия == "CRM")
                var dbClients = await _context.Clients
                    .AsNoTracking()
                    .Where(c => clientIdsInBusiness.Contains(c.Id) || c.Surname == "CRM")
                    .ToListAsync();

                // 3. Если в базе вообще пусто, отдаем пустой массив, чтобы фронтенд не падал
                if (!dbClients.Any())
                {
                    return Ok(new List<object>());
                }

                // 4. Формируем расширенный JSON-ответ, безопасно форматируя даты в памяти C# (.AsEnumerable)
                var filteredClients = dbClients.AsEnumerable().Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Surname,
                    c.IsBlocked,
                    c.Notes, // Твой телефон/контакты
                    c.Gender,
                    c.Discount,
                    c.SourceOfAttraction,
                    DateOfBirth = c.DateOfBirth?.ToString("yyyy-MM-dd"),

                    Email = _context.Users
                        .Where(u => u.Role == "Client" && u.LinkedId == c.Id)
                        .Select(u => u.Email)
                        .FirstOrDefault() ?? "Email не привязан"
                }).ToList();

                return Ok(filteredClients);
            }
            catch (Exception ex)
            {
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

        [HttpGet("my-profile")]
        [Authorize]
        public async Task<IActionResult> GetMyProfile()
        {
            // Получаем ID пользователя из токена JWT
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim)) return Unauthorized();

            var user = await _context.Users.FindAsync(int.Parse(userIdClaim));
            if (user == null || !user.LinkedId.HasValue) return NotFound("Профиль клиента не связан.");

            var client = await _context.Clients.FindAsync(user.LinkedId.Value);
            if (client == null) return NotFound("Анкета клиента не найдена.");

            // Отдаем на фронтенд полную коммерческую анкету бьюти-гостя
            return Ok(new
            {
                Id = client.Id,
                Name = client.Name,
                Surname = client.Surname,
                Email = user.Email,
                Notes = client.Notes, // Твой телефон
                DateOfBirth = client.DateOfBirth?.ToString("yyyy-MM-dd"), // ISO формат для календаря React
                Gender = client.Gender,
                SourceOfAttraction = client.SourceOfAttraction
            });
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
