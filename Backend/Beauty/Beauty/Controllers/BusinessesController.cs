using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Beauty.Models;

namespace Beauty.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BusinessesController : ControllerBase
    {
        private readonly BeautySalonContext _context;
        public BusinessesController(BeautySalonContext context) { _context = context; }

        private double CalculateSalonRating(int businessId)
        {
            var hasReviews = _context.Reviews.Any(r => r.BusinessId == businessId);
            if (!hasReviews) return 5.0;
            var average = _context.Reviews.Where(r => r.BusinessId == businessId).Average(r => r.Rating);
            return Math.Round(average, 1);
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<object>>> GetBusinesses()
        {
            var businesses = await _context.Businesses.ToListAsync();
            var result = businesses.Select(b => new {
                id = b.Id,
                name = b.Name,
                address = b.Address,
                ownerId = b.OwnerId,
                logoUrl = b.LogoUrl,
                description = b.Description,
                workingHours = b.WorkingHours,
                phone = b.Phone,
                interiorPhotos = b.InteriorPhotos,
                rating = CalculateSalonRating(b.Id)
            });
            return Ok(result);
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<ActionResult<object>> GetBusiness(int id)
        {
            var business = await _context.Businesses.FindAsync(id);
            if (business == null) return NotFound("Салон красоты не найден в базе CRM.");
            var result = new
            {
                id = business.Id,
                name = business.Name,
                address = business.Address,
                ownerId = business.OwnerId,
                logoUrl = business.LogoUrl,
                description = business.Description,
                workingHours = business.WorkingHours,
                phone = business.Phone,
                interiorPhotos = business.InteriorPhotos,
                rating = CalculateSalonRating(business.Id)
            };
            return Ok(result);
        }

        // --- УМНЫЙ GET С ФИЛЬТРАЦИЕЙ САЛОНОВ ПО БЬЮТИ-КАТЕГОРИЯМ ---
        // GET: api/Businesses/by-category?category=barber
        [HttpGet("by-category")]
        [AllowAnonymous] // Свободный доступ для гостей без авторизации
        public async Task<ActionResult<IEnumerable<object>>> GetBusinessesByCategory([FromQuery] string category)
        {
            try
            {
                if (string.IsNullOrEmpty(category)) return BadRequest("Категория не указана.");

                // 1. Скачиваем весь список салонов из PostgreSQL
                var allBusinesses = await _context.Businesses.ToListAsync();

                // Если передано ключевое слово "all", сразу возвращаем весь каталог
                if (category.ToLower() == "all" || !allBusinesses.Any())
                {
                    var allResult = allBusinesses.Select(b => new { id = b.Id, name = b.Name, address = b.Address, ownerId = b.OwnerId, logoUrl = b.LogoUrl, description = b.Description, workingHours = b.WorkingHours, phone = b.Phone, interiorPhotos = b.InteriorPhotos, rating = CalculateSalonRating(b.Id) });
                    return Ok(allResult);
                }

                string searchKey = category.ToLower().Trim();

                // 2. ИСПРАВЛЕНО: Чистая фильтрация по существующим таблицам Emploees и Services
                var filteredBusinesses = allBusinesses.Where(b => {
                    string sName = (b.Name ?? "").ToLower();
                    string sDesc = (b.Description ?? "").ToLower();

                    // Особый случай для барбершопа (по маркеру barber с фронтенда)
                    if (searchKey == "barber" || searchKey.Contains("брит") || searchKey.Contains("бород"))
                    {
                        return sName.Contains("барбер") || sName.Contains("barber") || sName.Contains("мужск") ||
                               sDesc.Contains("барбер") || sDesc.Contains("barber") || sDesc.Contains("брит") || sDesc.Contains("бород") ||
                               _context.Emploees.Any(e => e.BusinessId == b.Id && e.JobTitle != null && (e.JobTitle.ToLower().Contains("барбер") || e.JobTitle.ToLower().Contains("брит"))) ||
                               _context.Emploees.Any(e => e.BusinessId == b.Id && e.EmployeeServices != null && (e.EmployeeServices.ToLower().Contains("брит") || e.EmployeeServices.ToLower().Contains("бород")));
                    }
                    // ИСПРАВЛЕНО: Всеядный мягкий фильтр для ногтевой категории салонов!
                    if (searchKey.Contains("маник") || searchKey.Contains("ногт") || searchKey.Contains("nail"))
                    {
                        bool matchInSalon = sName.Contains("маник") || sDesc.Contains("маник") || sName.Contains("ногт") || sDesc.Contains("ногт");

                        bool matchInEmployees = _context.Emploees.Any(e => e.BusinessId == b.Id && e.JobTitle != null &&
                            (e.JobTitle.ToLower().Contains("маник") || e.JobTitle.ToLower().Contains("ногт") || e.JobTitle.ToLower().Contains("подолог")));

                        bool matchInServices = _context.Emploees.Any(e => e.BusinessId == b.Id && e.EmployeeServices != null &&
                            (e.EmployeeServices.ToLower().Contains("маник") || e.EmployeeServices.ToLower().Contains("ногт")));

                        return matchInSalon || matchInEmployees || matchInServices;
                    }


                    // Обычная фильтрация для остальных категорий (ногти, массаж, парикмахеры) по корню слова
                    string key = searchKey;
                    if (key.Length > 4) key = key.Substring(0, key.Length - 2);

                    return sName.Contains(key) || sDesc.Contains(key) ||
                           _context.Emploees.Any(e => e.BusinessId == b.Id && e.JobTitle != null && e.JobTitle.ToLower().Contains(key)) ||
                           _context.Emploees.Any(e => e.BusinessId == b.Id && e.EmployeeServices != null && e.EmployeeServices.ToLower().Contains(key));
                }).ToList();

                // 3. Если совпадений нет, возвращаем честный пустой список []
                if (!filteredBusinesses.Any())
                {
                    return Ok(new List<object>());
                }

                // 4. Формируем чистый отформатированный JSON-ответ
                var result = filteredBusinesses.Select(b => new {
                    id = b.Id,
                    name = b.Name,
                    address = b.Address,
                    ownerId = b.OwnerId,
                    logoUrl = b.LogoUrl,
                    description = b.Description,
                    workingHours = b.WorkingHours,
                    phone = b.Phone,
                    interiorPhotos = b.InteriorPhotos,
                    rating = CalculateSalonRating(b.Id)
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest($"Ошибка сервера при фильтрации категорий: {ex.Message}");
            }
        }




        // МЕТОД (POST): Создание новой организации/салона в системе
        // URL: api/Businesses
        [HttpPost]
        // Атрибут роли: Доступ разрешен только пользователям со строгим уровнем прав "Owner" (Владелец сети) или "Admin"
        [Authorize(Roles = "Owner,Admin")]
        public async Task<ActionResult<Business>> PostBusiness(Business business)
        {
            // Добавляем переданную модель салона в контекст данных Entity Framework Core
            _context.Businesses.Add(business);

            // Асинхронно сохраняем изменения, отправляя команду INSERT в базу данных PostgreSQL
            await _context.SaveChangesAsync();

            // Возвращаем статус 201 Created и ссылку на созданный ресурс через метод GetBusiness
            return CreatedAtAction("GetBusiness", new { id = business.Id }, business);
        }

        // МЕТОД (PUT): Полное обновление данных карточки салона по его Id
        // URL: api/Businesses/5
        [HttpPut("{id}")]
        [Authorize(Roles = "Owner,Admin")] // Защита прав доступа
        public async Task<IActionResult> PutBusiness(int id, Business business)
        {
            // ЗАЩИТНЫЙ БАРЬЕР: Если ID в строке адреса не совпадает с ID внутри JSON-объекта — рубим запрос
            if (id != business.Id) return BadRequest("Несоответствие ID салона.");

            // Помечаем объект в контексте ORM как измененный (Modified), чтобы EF Core сгенерировал SQL-команду UPDATE
            _context.Entry(business).State = EntityState.Modified;
            try
            {
                // Сохраняем изменения в СУБД PostgreSQL
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                // Если произошла ошибка параллельного доступа, проверяем, существует ли вообще этот салон в базе
                if (!BusinessExists(id)) return NotFound(); else throw;
            }

            // Возвращаем успешный пустой статус 204 NoContent (Данные успешно изменены на сервере)
            return NoContent();
        }


        // МЕТОД (POST): Асинхронная загрузка и сохранение графического логотипа салона
        // URL: api/Businesses/upload-logo/5
        [HttpPost("upload-logo/{id}")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> UploadLogo(int id, IFormFile file)
        {
            // Проверяем, передал ли фронтенд реальный файл картинки
            if (file == null || file.Length == 0) return BadRequest("Файл не выбран.");

            // Формируем физический путь на жестком диске сервера внутри папки wwwroot
            var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads/salons");

            // Если системной папки uploads/salons ещё нет на диске — автоматически создаем её
            if (!Directory.Exists(uploadsPath)) Directory.CreateDirectory(uploadsPath);

            // Генерируем уникальное случайное имя файла через GUID, чтобы файлы клиентов с одинаковыми именами не перезаписывали друг друга
            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";

            // Потоково (Stream) копируем и сохраняем файл изображения на жесткий диск сервера
            using (var stream = new FileStream(Path.Combine(uploadsPath, fileName), FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Находим нужный салон в базе PostgreSQL по его ID
            var business = await _context.Businesses.FindAsync(id);
            if (business == null) return NotFound("Салон не найден.");

            // Записываем относительный веб-путь к картинке в базу данных PostgreSQL
            business.LogoUrl = $"/uploads/salons/{fileName}";

            // Фиксируем изменения в базе данных
            await _context.SaveChangesAsync();

            // Возвращаем статус 200 OK и JSON-ответ с новым URL аватарки для мгновенного обновления на фронтенде React
            return Ok(new { url = business.LogoUrl });
        }


        // МЕТОД (POST): Загрузка фотографий внутреннего интерьера салона в галерею
        // URL: api/Businesses/upload-interior/5
        [HttpPost("upload-interior/{id}")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> UploadInterior(int id, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("Файл не выбран.");

            // Формируем физический путь к папке интерьеров на сервере
            var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads/interiors");
            if (!Directory.Exists(uploadsPath)) Directory.CreateDirectory(uploadsPath);

            // Создаем уникальное имя файла через GUID, сохраняя оригинальное расширение (.png / .jpg)
            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";

            using (var stream = new FileStream(Path.Combine(uploadsPath, fileName), FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var business = await _context.Businesses.FindAsync(id);
            if (business == null) return NotFound("Салон не найден.");

            // Если массив/список путей к фото интерьера ещё пуст в базе — инициализируем новый List
            if (business.InteriorPhotos == null) business.InteriorPhotos = new List<string>();

            // Формируем относительный веб-адрес фотографии
            var fileUrl = $"/uploads/interiors/{fileName}";

            // Добавляем новый путь в коллекцию (массив PostgreSQL) карточки салона
            business.InteriorPhotos.Add(fileUrl);

            // Обновляем состояние модели в контексте данных EF Core
            _context.Entry(business).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            // Возвращаем успешный JSON-ответ с адресом созданного файла
            return Ok(new { url = fileUrl });
        }


        // МЕТОД (DELETE): Физическое удаление фотографии интерьера с жесткого диска сервера и из базы данных
        // URL: api/Businesses/delete-interior/5?photoUrl=/uploads/interiors/abc.jpg
        [HttpDelete("delete-interior/{id}")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> DeleteInterior(int id, [FromQuery] string photoUrl)
        {
            if (string.IsNullOrEmpty(photoUrl)) return BadRequest("Путь не указан.");

            var business = await _context.Businesses.FindAsync(id);
            if (business == null) return NotFound("Салон не найден.");

            // Проверяем, существует ли переданный путь к фотографии внутри массива карточки салона
            if (business.InteriorPhotos != null && business.InteriorPhotos.Contains(photoUrl))
            {
                // Шаг 1: Удаляем строковый путь к картинке из массива в базе данных PostgreSQL
                business.InteriorPhotos.Remove(photoUrl);
                _context.Entry(business).State = EntityState.Modified;
                await _context.SaveChangesAsync(); // Фиксируем изменения в СУБД

                // Шаг 2: Формируем абсолютный системный путь к файлу на сервере
                var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", photoUrl.TrimStart('/'));

                // Физически стираем файл изображения с жесткого диска сервера, чтобы не забивать память кэшем
                if (System.IO.File.Exists(fullPath)) System.IO.File.Delete(fullPath);

                return Ok(new { message = "Успешно удалено" });
            }
            return BadRequest("Фото не найдено.");
        }

        // ХЕЛПЕР: Быстрая проверка существования салона в контексте данных по его первичному ключу Id
        private bool BusinessExists(int id) { return _context.Businesses.Any(e => e.Id == id); }
    }
}



