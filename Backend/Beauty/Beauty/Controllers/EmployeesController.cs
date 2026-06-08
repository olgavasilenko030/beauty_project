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
    public class EmployeesController : ControllerBase
    {
        private readonly BeautySalonContext _context;

        public EmployeesController(BeautySalonContext context)
        {
            _context = context;
        }

        // --- ПУБЛИЧНЫЙ ЭНДПОИНТ ДЛЯ ГЛАВНОЙ СТРАНИЦЫ (БЕЗ АВТОРИЗАЦИИ) ---
        // GET: api/Employees/public-top
        [HttpGet("public-top")]
        [AllowAnonymous] // Доступен гостям сайта
        public async Task<ActionResult<IEnumerable<object>>> GetPublicTopMasters()
        {
            return await _context.Emploees
                .AsNoTracking()
                .Take(6) // Ограничиваем вывод для карточек на главной
                .Select(e => new
                {
                    e.Id,
                    e.Name,
                    e.Surname,
                    e.JobTitle,
                    // Используем поле аватара из связанной сущности или дефолтное
                    AvatarUrl = _context.Users
                        .Where(u => u.Role == "Master" && u.LinkedId == e.Id)
                        .Select(u => u.AvatarUrl)
                        .FirstOrDefault()
                })
                .ToListAsync();
        }
        // GET: api/Employees или api/Employees?businessId=1
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetEmployees([FromQuery] int? businessId)
        {
            var query = _context.Emploees.AsQueryable();

            if (businessId.HasValue)
            {
                query = query.Where(e => e.BusinessId == businessId.Value);
            }

            // ИСПРАВЛЕНО: Явно подгружаем связанные услуги через Include, чтобы они не были пустыми
            var employeesList = await query.Include(e => e.Services).ToListAsync();

            // Формируем плоскую структуру DTO с маленькими camelCase буквами для React и живым рейтингом!
            var result = employeesList.Select(e => new
            {
                id = e.Id,
                name = e.Name,
                surname = e.Surname,
                jobTitle = e.JobTitle,
                phone = e.Phone,
                businessId = e.BusinessId,
                portfolioPhotos = e.PortfolioPhotos,
                rating = CalculateMasterRating(e.Id), // Динамический расчет рейтинга мастера по отзывам

                avatarUrl = _context.Users
                    .Where(u => u.Role == "Master" && u.LinkedId == e.Id)
                    .Select(u => u.AvatarUrl)
                    .FirstOrDefault() ?? e.Description ?? "",

                // ИСПРАВЛЕНО: Прямой маппинг коллекции без конфликтов типов данных C#
                services = e.Services.Select(s => new
                {
                    id = s.Id,
                    name = s.Name,
                    price = s.Price,
                    duration = s.Duration.ToString(@"hh\:mm")
                }).ToList()
            }).ToList();

            return Ok(result);
        }




        // GET: api/Employees/5
        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<Emploee>> GetEmploee(int id)
        {
            var emploee = await _context.Emploees
                .Include(e => e.Services) // Подтягиваем услуги и для карточки отдельного мастера
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == id);

            if (emploee == null) return NotFound("Сотрудник не найден.");
            return emploee;
        }

        // PUT: api/Employees/5
        [HttpPut("{id}")]
        [Authorize(Roles = "Owner,Admin")] // Редактировать мастеров может только бизнес
        public async Task<IActionResult> PutEmploee(int id, [FromBody] Emploee emploee)
        {
            if (id != emploee.Id)
            {
                return BadRequest("Идентификатор сотрудника не совпадает с параметрами запроса.");
            }

            if (string.IsNullOrEmpty(emploee.Name))
            {
                return BadRequest("Имя мастера обязательно для заполнения.");
            }

            // 1. ИСПРАВЛЕНО: Сначала находим оригинальную запись мастера в базе данных PostgreSQL
            var existingEmployee = await _context.Emploees.FindAsync(id);
            if (existingEmployee == null)
            {
                return NotFound("Сотрудник для обновления не найден в системе CRM.");
            }

            // 2. ИСПРАВЛЕНО: Обновляем строго только те поля, которые пришли из формы редактирования
            existingEmployee.Name = emploee.Name;
            existingEmployee.Surname = emploee.Surname;
            existingEmployee.JobTitle = emploee.JobTitle;
            existingEmployee.Phone = emploee.Phone;

            // Защита: Если с фронтенда по ошибке прилетел null в полях медиа, мы НЕ затираем аватарку и портфолио!
            if (!string.IsNullOrEmpty(emploee.Description) && emploee.Description.StartsWith("/uploads"))
            {
                existingEmployee.Description = emploee.Description;
            }
            if (emploee.PortfolioPhotos != null && emploee.PortfolioPhotos.Count > 0)
            {
                existingEmployee.PortfolioPhotos = emploee.PortfolioPhotos;
            }

            _context.Entry(existingEmployee).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!EmploeeExists(id))
                {
                    return NotFound("Сотрудник для обновления не найден.");
                }
                else
                {
                    throw;
                }
            }

            return Ok(new { message = "Данные мастера успешно обновлены" });
        }


        // POST: api/Employees
        [HttpPost]
        [Authorize(Roles = "Owner,Admin")] // Добавлять мастеров может только бизнес
        public async Task<ActionResult<Emploee>> PostEmploee(Emploee emploee)
        {
            if (string.IsNullOrEmpty(emploee.Name)) return BadRequest("Имя мастера обязательно для заполнения.");

            _context.Emploees.Add(emploee);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEmploee), new { id = emploee.Id }, emploee);
        }

        // POST: api/Employees/upload-avatar/5
        [HttpPost("upload-avatar/{id}")]
        [Authorize]
        public async Task<IActionResult> UploadAvatar(int id, IFormFile file)
        {
            var employee = await _context.Emploees.FindAsync(id);
            if (employee == null) return NotFound("Сотрудник не найден в системе салона.");

            if (file == null || file.Length == 0) return BadRequest("Файл фотографии не выбран.");

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "avatars");
            if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

            var fileName = $"avatar-{id}-{Guid.NewGuid()}.jpg";
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var avatarPath = $"/uploads/avatars/{fileName}";

            // 1. ALWAYS save it directly to the Employee description field as a reliable fallback
            employee.Description = avatarPath;
            _context.Entry(employee).State = EntityState.Modified;

            // 2. ALSO save it to the Users credentials table IF an account was already generated
            var userMaster = await _context.Users.FirstOrDefaultAsync(u => u.Role == "Master" && u.LinkedId == id);
            if (userMaster != null)
            {
                userMaster.AvatarUrl = avatarPath;
                _context.Entry(userMaster).State = EntityState.Modified;
            }

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { url = avatarPath });
            }
            catch (Exception ex)
            {
                return BadRequest($"Ошибка записи базы данных: {ex.InnerException?.Message ?? ex.Message}");
            }
        }



        // POST: api/Employees/upload-portfolio/5
        [HttpPost("upload-portfolio/{id}")]
        [Authorize(Roles = "Owner,Admin,Master")] // Мастер тоже может загружать свои работы
        public async Task<IActionResult> UploadPortfolio(int id, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("Файл не выбран.");

            // Создаем физическую папку на сервере
            var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads/portfolio");
            if (!Directory.Exists(uploadsPath)) Directory.CreateDirectory(uploadsPath);

            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var filePath = Path.Combine(uploadsPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var employee = await _context.Emploees.FindAsync(id);
            if (employee == null) return NotFound("Мастер не найден.");

            if (employee.PortfolioPhotos == null) employee.PortfolioPhotos = new List<string>();

            var fileUrl = $"/uploads/portfolio/{fileName}";
            employee.PortfolioPhotos.Add(fileUrl);

            _context.Entry(employee).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return Ok(new { url = fileUrl });
        }

        // DELETE: api/Employees/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> DeleteEmploee(int id)
        {
            var emploee = await _context.Emploees.FindAsync(id);
            if (emploee == null) return NotFound("Сотрудник не найден.");

            // Проверяем, есть ли у мастера активные записи клиентов
            bool hasRecordings = await _context.Recordings.AnyAsync(r => r.EmploeeId == id && r.Status != "Cancelled");
            if (hasRecordings)
            {
                return BadRequest("Нельзя удалить мастера, так как у него есть незавершенные записи клиентов.");
            }

            _context.Emploees.Remove(emploee);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/Employees/delete-portfolio/5?photoUrl=uploads/portfolio/file.jpg
        [HttpDelete("delete-portfolio/{id}")]
        [Authorize] // Позволяем удалять авторизованному бизнесу или мастеру
        public async Task<IActionResult> DeletePortfolio(int id, [FromQuery] string photoUrl)
        {
            if (string.IsNullOrEmpty(photoUrl))
                return BadRequest("Путь к фотографии не указан.");

            // Находим мастера в базе данных
            var employee = await _context.Emploees.FindAsync(id);
            if (employee == null)
                return NotFound("Мастер не найден в системе.");

            // Нормализуем путь (убираем возможные ведущие слэши для точного поиска в списке)
            var cleanPhotoUrl = photoUrl.TrimStart('/');
            var matchUrl = employee.PortfolioPhotos?.FirstOrDefault(p => p.TrimStart('/') == cleanPhotoUrl);

            if (matchUrl != null)
            {
                // 1. Удаляем путь из массива в базе данных PostgreSQL
                employee.PortfolioPhotos.Remove(matchUrl);
                _context.Entry(employee).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                // 2. Безопасно удаляем физический файл с диска сервера
                var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", cleanPhotoUrl);
                if (System.IO.File.Exists(fullPath))
                {
                    System.IO.File.Delete(fullPath);
                }

                return Ok(new { message = "Фото успешно удалено из портфолио мастера" });
            }

            return BadRequest("Указанное фото не найдено в портфолио этого мастера.");
        }

        // Вспомогательный приватный метод для динамического пересчета рейтинга мастера на основе отзывов
        private double CalculateMasterRating(int employeeId)
        {
            // Находим все ID записей визитов в таблице recording, которые принадлежат этому мастеру
            var recordingIds = _context.Recordings
                .Where(r => r.EmploeeId == employeeId)
                .Select(r => r.Id)
                .ToList();

            if (!recordingIds.Any()) return 5.0; // Если к мастеру еще нет записей визитов

            // Считаем среднюю оценку из таблицы Reviews для этих записей
            var hasReviews = _context.Reviews.Any(r => recordingIds.Contains(r.RecordingId));
            if (!hasReviews) return 5.0; // Если визиты есть, но отзывов еще нет — по умолчанию 5.0

            var average = _context.Reviews
                .Where(r => recordingIds.Contains(r.RecordingId))
                .Average(r => r.Rating);

            return Math.Round(average, 1); // Округляем до одного знака (например, 4.7)
        }



        private bool EmploeeExists(int id)
        {
            return _context.Emploees.Any(e => e.Id == id);
        }
    }
}
