using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Beauty.Models; // Подключаем нашу единственную правильную папку моделей

namespace Beauty.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly BeautySalonContext _context;

        public ReviewsController(BeautySalonContext context)
        {
            _context = context;
        }

        // GET: api/Reviews
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Beauty.Models.Review>>> GetReviews()
        {
            return await _context.Reviews.ToListAsync();
        }

        // GET: api/Reviews/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Beauty.Models.Review>> GetReview(int id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound();
            return review;
        }

        // GET: api/Reviews/business/5 (Выгрузка отзывов для SalonDetailPage)
        [HttpGet("business/{businessId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBusinessReviews(int businessId)
        {
            try
            {
                var reviews = await _context.Reviews
                    .Where(r => r.BusinessId == businessId)
                    .OrderByDescending(r => r.CreatedAt)
                    .ToListAsync();
                return Ok(reviews);
            }
            catch (Exception ex)
            {
                return BadRequest($"Ошибка получения отзывов: {ex.Message}");
            }
        }

        // POST: api/Reviews (ИСПРАВЛЕНО: Статус записи остается 'Completed', чтобы не нарушать check_status в pgAdmin!)
        [HttpPost]
        public async Task<IActionResult> PostReview([FromBody] System.Text.Json.JsonElement rawData)
        {
            try
            {
                int recordingId = rawData.GetProperty("recordingId").GetInt32();
                int clientId = rawData.GetProperty("clientId").GetInt32();
                int businessId = rawData.GetProperty("businessId").GetInt32();
                int rating = rawData.GetProperty("rating").GetInt32();

                string comment = "";
                if (rawData.TryGetProperty("comment", out var commentProp) && commentProp.ValueKind != System.Text.Json.JsonValueKind.Null)
                {
                    comment = commentProp.GetString() ?? "";
                }

                var client = await _context.Clients.FirstOrDefaultAsync(c => c.Id == clientId);
                string clientName = client != null ? client.Name : "Клиент";

                var review = new Beauty.Models.Review
                {
                    RecordingId = recordingId,
                    ClientId = clientId,
                    BusinessId = businessId,
                    Rating = rating,
                    Comment = comment,
                    ClientName = clientName,
                    CreatedAt = DateTime.UtcNow
                };

                // 1. Сохраняем отзыв в базу данных
                _context.Reviews.Add(review);

                // 2. ИСПРАВЛЕНО: Убрали recording.Status = "Reviewed", чтобы НЕ вызывать ошибку check_status в PostgreSQL!
                // Запись просто остается в своем законном статусе 'Completed'.

                await _context.SaveChangesAsync();
                return Ok(new { message = "Отзыв успешно сохранен в базе данных PostgreSQL!" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRM ERROR] Ошибка внутри PostReview: {ex.Message}");
                return BadRequest($"Ошибка на стороне сервера: {ex.Message}");
            }
        }




        // DELETE: api/Reviews/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReview(int id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound();

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
