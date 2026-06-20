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

        // --- УМНЫЙ И БЕЗОПАСНЫЙ GET С ФИЛЬТРАЦИЕЙ КЛИЕНТОВ САЛОНА ---
        // GET: api/Clients?businessId=1
        [HttpGet]
        [Authorize] // Защита эндпоинта JWT Bearer токеном
        public async Task<IActionResult> GetClients([FromQuery] int businessId)
        {
            if (businessId == 0) return BadRequest("Идентификатор бизнеса не указан.");

            try
            {
                // 1. Находим ID всех клиентов, у которых уже есть реальные бьюти-визиты в этот конкретный салон
                var clientIdsInBusiness = await (from r in _context.Recordings
                                                 join e in _context.Emploees on r.EmploeeId equals e.Id
                                                 where e.BusinessId == businessId && r.ClientId.HasValue
                                                 select r.ClientId.Value)
                                                 .Distinct()
                                                 .ToListAsync();

                // КЛЮЧЕВОЙ МАРКЕР: Формируем текстовую метку нашего салона для поиска "ручных" клиентов без записей
                string businessTag = $"bId_{businessId}_";

                // 2. ИСПРАВЛЕНО: Скачиваем клиентов из PostgreSQL.
                // Вытаскиваем тех, у кого есть визиты, ИЛИ у кого в поле Notes зашит маркер этого салона, ИЛИ фамилия "CRM"
                var dbClients = await _context.Clients
                    .AsNoTracking()
                    .Where(c => clientIdsInBusiness.Contains(c.Id) ||
                                c.Surname == "CRM" ||
                                (c.Notes != null && c.Notes.StartsWith(businessTag)))
                    .ToListAsync();

                if (!dbClients.Any())
                {
                    return Ok(new List<object>());
                }

                // 3. Формируем расширенный JSON-ответ, безопасно форматируя данные в оперативной памяти сервера (.AsEnumerable)
                var filteredClients = dbClients.AsEnumerable().Select(c => {
                    // Если у клиента в телефоне зашит наш системный маркер салона, красиво очищаем его перед отправкой на экран
                    string displayPhone = c.Notes ?? "Контакты";
                    if (displayPhone.StartsWith(businessTag))
                    {
                        displayPhone = displayPhone.Replace(businessTag, ""); // Срезаем bId_1_, оставляя чистый телефон гостя!
                    }

                    return new
                    {
                        c.Id,
                        c.Name,
                        c.Surname,
                        c.IsBlocked,
                        Notes = displayPhone, // На фронтенд React улетает чистый, красивый номер телефона!
                        c.Gender,
                        c.Discount,
                        c.SourceOfAttraction,
                        DateOfBirth = c.DateOfBirth?.ToString("yyyy-MM-dd"),

                        Email = _context.Users
                            .Where(u => u.Role == "Client" && u.LinkedId == c.Id)
                            .Select(u => u.Email)
                            .FirstOrDefault() ?? "Email не привязан"
                    };
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


        // МЕТОД (POST): Создание карточки нового клиента
        // URL: api/Clients
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<Client>> PostClient(Client client)
        {
            // БЭКЕНД-ВАЛИДАЦИЯ ТЕЛЕФОНА: Вырезаем маркер салона bId_..._ для проверки реального номера
            string realPhone = client.Notes ?? "";
            if (realPhone.StartsWith("bId_"))
            {
                // Отрезаем маркер, чтобы проверить только чистый номер телефона
                int secondUnderscore = realPhone.IndexOf('_', 4);
                if (secondUnderscore != -1)
                {
                    realPhone = realPhone.Substring(secondUnderscore + 1);
                }
            }

            // КРИТИЧЕСКИЙ ДЕФЕНС: Если в номере телефона осталась хоть одна БУКВА, жестко рубим запрос!
            if (System.Text.RegularExpressions.Regex.IsMatch(realPhone, @"[a-zA-Zа-яА-Я]"))
            {
                return BadRequest("Ошибка валидации сервера: Номер телефона не должен содержать буквы!");
            }

            // Если номер пустой после очистки фронтенда, тоже блокируем запись
            if (string.IsNullOrWhiteSpace(realPhone) || realPhone == "Контакты")
            {
                return BadRequest("Ошибка валидации сервера: Номер телефона обязателен для заполнения!");
            }

            _context.Clients.Add(client);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetClient), new { id = client.Id }, client);
        }

        // МЕТОД (PUT): Редактирование существующей карточки клиента
        // URL: api/Clients/5
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> PutClient(int id, Client client)
        {
            if (id != client.Id) return BadRequest("Идентификатор не совпадает.");

            // БЭКЕНД-ВАЛИДАЦИЯ ПРИ ОБНОВЛЕНИИ КАРТОЧКИ: Защита от ручного ввода букв при редактировании
            string realPhone = client.Notes ?? "";
            if (realPhone.StartsWith("bId_"))
            {
                int secondUnderscore = realPhone.IndexOf('_', 4);
                if (secondUnderscore != -1) realPhone = realPhone.Substring(secondUnderscore + 1);
            }

            if (System.Text.RegularExpressions.Regex.IsMatch(realPhone, @"[a-zA-Zа-яА-Я]"))
            {
                return BadRequest("Ошибка валидации сервера: Запрещено сохранять буквы в номере телефона!");
            }

            _context.Entry(client).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Clients.Any(e => e.Id == id)) return NotFound();
                throw;
            }

            return NoContent();
        }



        private bool ClientExists(int id)
        {
            return _context.Clients.Any(e => e.Id == id);
        }
    }
}
