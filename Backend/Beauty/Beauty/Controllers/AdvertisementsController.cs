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
    public class AdvertisementsController : ControllerBase
    {
        private readonly BeautySalonContext _context;

        public AdvertisementsController(BeautySalonContext context)
        {
            _context = context;
        }

        // GET: api/Advertisements (Все кампании в системе)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Advertisement>>> GetAdvertisements()
        {
            return await _context.Advertisements.ToListAsync();
        }

        // GET: api/Advertisements/active (ДОБАВЛЕНО: Скачать активную рекламу для Главной и Личного кабинета)
        [HttpGet("active")]
        [AllowAnonymous]
        public async Task<IActionResult> GetActiveAds()
        {
            try
            {
                var ads = await _context.Advertisements
                    .Where(a => a.IsActive)
                    .OrderByDescending(a => a.CreatedAt)
                    .ToListAsync();

                // Принудительный camelCase для React-компонентов
                var result = ads.Select(a => new
                {
                    id = a.Id,
                    businessId = a.BusinessId,
                    title = a.Title,
                    imageUrl = a.ImageUrl,
                    targetUrl = a.TargetUrl,
                    format = a.Format,
                    isActive = a.IsActive,
                    createdAt = a.CreatedAt
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest($"Ошибка при получении рекламы: {ex.Message}");
            }
        }

        // GET: api/Advertisements/salon/5 (ДОБАВЛЕНО: Выгрузить рекламу конкретного салона)
        [HttpGet("salon/{businessId}")]
        [AllowAnonymous] // Оставляем открытым для тестов в ЛК салона
        public async Task<IActionResult> GetSalonAds(int businessId)
        {
            var ads = await _context.Advertisements
                .Where(a => a.BusinessId == businessId)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return Ok(ads);
        }

        // POST: api/Advertisements (ИСПРАВЛЕНО: Создание новой тестовой рекламы)
        [HttpPost]
        public async Task<ActionResult<Advertisement>> PostAdvertisement(Advertisement advertisement)
        {
            try
            {
                advertisement.CreatedAt = DateTime.UtcNow;
                advertisement.IsActive = true;

                _context.Advertisements.Add(advertisement);
                await _context.SaveChangesAsync();

                return CreatedAtAction("GetAdvertisement", new { id = advertisement.Id }, advertisement);
            }
            catch (Exception ex)
            {
                return BadRequest($"Ошибка при сохранении рекламы: {ex.Message}");
            }
        }

        // GET: api/Advertisements/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Advertisement>> GetAdvertisement(int id)
        {
            var advertisement = await _context.Advertisements.FindAsync(id);
            if (advertisement == null) return NotFound();
            return advertisement;
        }

        // POST: api/Advertisements/upload-image/5 (ДОБАВЛЕНО: Загрузка картинок баннеров на бэкенд)
        [HttpPost("upload-image/{businessId}")]
        public async Task<IActionResult> UploadAdImage(int businessId, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("Файл не выбран.");

            var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads/ads");
            if (!Directory.Exists(uploadsPath)) Directory.CreateDirectory(uploadsPath);

            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var filePath = Path.Combine(uploadsPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            string fileUrl = $"/uploads/ads/{fileName}";
            return Ok(new { url = fileUrl });
        }

        // PATCH: api/Advertisements/toggle/5 (ДОБАВЛЕНО: Включение/Выключение рекламы одной кнопкой)
        [HttpPatch("toggle/{id}")]
        public async Task<IActionResult> ToggleAdStatus(int id)
        {
            var ad = await _context.Advertisements.FindAsync(id);
            if (ad == null) return NotFound("Рекламное объявление не найдено.");

            ad.IsActive = !ad.IsActive;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Статус рекламы изменен", isActive = ad.IsActive });
        }

        // DELETE: api/Advertisements/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAdvertisement(int id)
        {
            var advertisement = await _context.Advertisements.FindAsync(id);
            if (advertisement == null) return NotFound();

            _context.Advertisements.Remove(advertisement);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool AdvertisementExists(int id)
        {
            return _context.Advertisements.Any(e => e.Id == id);
        }
    }
}
