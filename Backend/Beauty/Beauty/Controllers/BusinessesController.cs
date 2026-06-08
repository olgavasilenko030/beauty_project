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

        [HttpGet("by-category")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<object>>> GetBusinessesByCategory([FromQuery] string category)
        {
            try
            {
                if (string.IsNullOrEmpty(category)) return BadRequest("Категория не указана.");
                var allBusinesses = await _context.Businesses.ToListAsync();
                if (category.ToLower() == "all" || !allBusinesses.Any())
                {
                    var allResult = allBusinesses.Select(b => new { id = b.Id, name = b.Name, address = b.Address, ownerId = b.OwnerId, logoUrl = b.LogoUrl, description = b.Description, workingHours = b.WorkingHours, phone = b.Phone, interiorPhotos = b.InteriorPhotos, rating = CalculateSalonRating(b.Id) });
                    return Ok(allResult);
                }
                var employees = await _context.Emploees.ToListAsync();
                var filteredBusinesses = allBusinesses.Where(b => employees.Any(e => e.BusinessId == b.Id && ((e.JobTitle != null && e.JobTitle.ToLower().Contains(category.ToLower())) || (e.EmployeeServices != null && e.EmployeeServices.ToLower().Contains(category.ToLower()))))).ToList();
                if (!filteredBusinesses.Any())
                {
                    filteredBusinesses = allBusinesses.Where(b => (b.Description != null && b.Description.ToLower().Contains(category.ToLower())) || (b.Name != null && b.Name.ToLower().Contains(category.ToLower()))).ToList();
                }
                if (!filteredBusinesses.Any()) filteredBusinesses = allBusinesses;
                var result = filteredBusinesses.Select(b => new { id = b.Id, name = b.Name, address = b.Address, ownerId = b.OwnerId, logoUrl = b.LogoUrl, description = b.Description, workingHours = b.WorkingHours, phone = b.Phone, interiorPhotos = b.InteriorPhotos, rating = CalculateSalonRating(b.Id) });
                return Ok(result);
            }
            catch (Exception ex) { return BadRequest($"Ошибка сервера: {ex.Message}"); }
        }
        [HttpPost]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<ActionResult<Business>> PostBusiness(Business business)
        {
            _context.Businesses.Add(business);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetBusiness", new { id = business.Id }, business);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> PutBusiness(int id, Business business)
        {
            if (id != business.Id) return BadRequest("Несоответствие ID салона.");
            _context.Entry(business).State = EntityState.Modified;
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException) { if (!BusinessExists(id)) return NotFound(); else throw; }
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> DeleteBusiness(int id)
        {
            var business = await _context.Businesses.FindAsync(id);
            if (business == null) return NotFound("Организация для удаления не найдена.");
            bool hasEmployees = await _context.Emploees.AnyAsync(e => e.BusinessId == id);
            if (hasEmployees) return BadRequest("Невозможно удалить филиал, так как к нему привязаны сотрудники.");
            _context.Businesses.Remove(business);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("upload-logo/{id}")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> UploadLogo(int id, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("Файл не выбран.");
            var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads/salons");
            if (!Directory.Exists(uploadsPath)) Directory.CreateDirectory(uploadsPath);
            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            using (var stream = new FileStream(Path.Combine(uploadsPath, fileName), FileMode.Create)) { await file.CopyToAsync(stream); }
            var business = await _context.Businesses.FindAsync(id);
            if (business == null) return NotFound("Салон не найден.");
            business.LogoUrl = $"/uploads/salons/{fileName}";
            await _context.SaveChangesAsync();
            return Ok(new { url = business.LogoUrl });
        }

        [HttpPost("upload-interior/{id}")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> UploadInterior(int id, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("Файл не выбран.");
            var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads/interiors");
            if (!Directory.Exists(uploadsPath)) Directory.CreateDirectory(uploadsPath);
            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            using (var stream = new FileStream(Path.Combine(uploadsPath, fileName), FileMode.Create)) { await file.CopyToAsync(stream); }
            var business = await _context.Businesses.FindAsync(id);
            if (business == null) return NotFound("Салон не найден.");
            if (business.InteriorPhotos == null) business.InteriorPhotos = new List<string>();
            var fileUrl = $"/uploads/interiors/{fileName}";
            business.InteriorPhotos.Add(fileUrl);
            _context.Entry(business).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return Ok(new { url = fileUrl });
        }

        [HttpDelete("delete-interior/{id}")]
        [Authorize(Roles = "Owner,Admin")]
        public async Task<IActionResult> DeleteInterior(int id, [FromQuery] string photoUrl)
        {
            if (string.IsNullOrEmpty(photoUrl)) return BadRequest("Путь не указан.");
            var business = await _context.Businesses.FindAsync(id);
            if (business == null) return NotFound("Салон не найден.");
            if (business.InteriorPhotos != null && business.InteriorPhotos.Contains(photoUrl))
            {
                business.InteriorPhotos.Remove(photoUrl);
                _context.Entry(business).State = EntityState.Modified;
                await _context.SaveChangesAsync();
                var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", photoUrl.TrimStart('/'));
                if (System.IO.File.Exists(fullPath)) System.IO.File.Delete(fullPath);
                return Ok(new { message = "Успешно удалено" });
            }
            return BadRequest("Фото не найдено.");
        }

        private bool BusinessExists(int id) { return _context.Businesses.Any(e => e.Id == id); }
    }
}
