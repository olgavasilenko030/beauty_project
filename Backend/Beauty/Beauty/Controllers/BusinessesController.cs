using System;
using System.Collections.Generic;
using System.IO;
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
    public class BusinessesController : ControllerBase
    {
        private readonly BeautySalonContext _context;

        public BusinessesController(BeautySalonContext context)
        {
            _context = context;
        }

        // GET: api/Businesses
        // Метод доступен без авторизации, чтобы гости на главной могли видеть список филиалов (при масштабировании)
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<Business>>> GetBusinesses()
        {
            return await _context.Businesses.AsNoTracking().ToListAsync();
        }

        // --- ИСПРАВЛЕНО: Избегаем циклической ссылки (Circular Reference) через плоский анонимный объект ---
        // GET: api/Businesses/5
        [HttpGet("{id}")]
        [Authorize] // Доступно авторизованным пользователям для просмотра деталей
        public async Task<IActionResult> GetBusiness(int id)
        {
            var businessDto = await _context.Businesses
                .AsNoTracking()
                .Where(b => b.Id == id)
                .Select(b => new
                {
                    b.Id,
                    b.Name,
                    b.Address,
                    b.OwnerId,
                    b.LogoUrl,
                    b.Phone,
                    b.Description,
                    b.WorkingHours,
                    b.WorkingDays,
                    b.SocialLinks,
                    b.InteriorPhotos
                })
                .FirstOrDefaultAsync();

            if (businessDto == null)
            {
                return NotFound("Салон или филиал бизнеса не найден.");
            }

            return Ok(businessDto);
        }

        // PUT: api/Businesses/5
        [HttpPut("{id}")]
        [Authorize(Roles = "Owner,Admin")] // Редактировать данные салона может только Владелец или Администратор
        public async Task<IActionResult> PutBusiness(int id, [FromBody] Business business)
        {
            if (id != business.Id)
            {
                return BadRequest("Идентификатор бизнеса не совпадает с параметрами запроса.");
            }

            var existingBusiness = await _context.Businesses.FindAsync(id);
            if (existingBusiness == null)
            {
                return NotFound("Запись о бизнесе для обновления не найдена в системе.");
            }

            // Явно переносим новые расширенные поля из payload фронтенда
            existingBusiness.Name = business.Name;
            existingBusiness.Address = business.Address;
            existingBusiness.Phone = business.Phone;
            existingBusiness.Description = business.Description;
            existingBusiness.WorkingHours = business.WorkingHours;
            existingBusiness.WorkingDays = business.WorkingDays;
            existingBusiness.SocialLinks = business.SocialLinks;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!BusinessExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/Businesses
        [HttpPost]
        [Authorize(Roles = "Admin")] // Только супер-администратор платформы может создавать корневой бизнес вручную
        public async Task<ActionResult<Business>> PostBusiness([FromBody] Business business)
        {
            if (string.IsNullOrEmpty(business.Name))
            {
                return BadRequest("Название организации обязательно для заполнения.");
            }

            _context.Businesses.Add(business);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetBusiness), new { id = business.Id }, business);
        }

        // DELETE: api/Businesses/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> DeleteBusiness(int id)
        {
            var business = await _context.Businesses.FindAsync(id);
            if (business == null)
            {
                return NotFound("Организация для удаления не найдена.");
            }

            // ПРОВЕРКА ЦЕЛОСТНОСТИ: Запрещаем удаление, если к салону привязаны мастера
            bool hasEmployees = await _context.Emploees.AnyAsync(e => e.BusinessId == id);
            if (hasEmployees)
            {
                return BadRequest("Невозможно удалить филиал, так как в базе данных к нему привязаны сотрудники салона.");
            }

            _context.Businesses.Remove(business);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // --- ЗАГРУЗКА ЛОГОТИПА/ФОТО САЛОНА ---
        // POST: api/Businesses/upload-logo/5
        [HttpPost("upload-logo/{id}")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> UploadLogo(int id, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Файл не выбран для загрузки.");

            var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads/salons");
            if (!Directory.Exists(uploadsPath))
                Directory.CreateDirectory(uploadsPath);

            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var filePath = Path.Combine(uploadsPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Находим салон
            var business = await _context.Businesses.FindAsync(id);
            if (business == null)
                return NotFound("Салон для обновления фото не найден.");

            business.LogoUrl = $"/uploads/salons/{fileName}";
            await _context.SaveChangesAsync();

            return Ok(new { url = business.LogoUrl });
        }

        // --- ЗАГРУЗКА ФОТОГРАФИЙ ИНТЕРЬЕРА В МАССИВ ---
        // POST: api/Businesses/upload-interior/5
        [HttpPost("upload-interior/{id}")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> UploadInterior(int id, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Файл не выбран для загрузки.");

            var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads/interiors");
            if (!Directory.Exists(uploadsPath))
                Directory.CreateDirectory(uploadsPath);

            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var filePath = Path.Combine(uploadsPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var business = await _context.Businesses.FindAsync(id);
            if (business == null)
                return NotFound("Салон для добавления интерьера не найден.");

            // Инициализируем список, если он пуст
            if (business.InteriorPhotos == null)
            {
                business.InteriorPhotos = new List<string>();
            }

            var fileUrl = $"/uploads/interiors/{fileName}";
            business.InteriorPhotos.Add(fileUrl);

            // Помечаем объект измененным для корректной записи List<string> (массив строк) в БД PostgreSQL
            _context.Entry(business).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return Ok(new { url = fileUrl });
        }

        // DELETE: api/Businesses/delete-interior/5?photoUrl=/uploads/interiors/file.jpg
        [HttpDelete("delete-interior/{id}")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> DeleteInterior(int id, [FromQuery] string photoUrl)
        {
            if (string.IsNullOrEmpty(photoUrl)) return BadRequest("Путь к фото не указан.");

            var business = await _context.Businesses.FindAsync(id);
            if (business == null) return NotFound("Салон не найден.");

            if (business.InteriorPhotos != null && business.InteriorPhotos.Contains(photoUrl))
            {
                // 1. Удаляем запись из массива в БД
                business.InteriorPhotos.Remove(photoUrl);
                _context.Entry(business).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                // 2. Безопасно удаляем файл с диска сервера
                var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", photoUrl.TrimStart('/'));
                if (System.IO.File.Exists(fullPath))
                {
                    System.IO.File.Delete(fullPath);
                }

                return Ok(new { message = "Фото интерьера успешно удалено" });
            }

            return BadRequest("Указанное фото не найдено в галерее салона.");
        }


        private bool BusinessExists(int id)
        {
            return _context.Businesses.Any(e => e.Id == id);
        }
    }
}
