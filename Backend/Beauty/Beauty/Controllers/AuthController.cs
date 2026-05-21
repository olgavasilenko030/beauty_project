using Beauty.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Beauty.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly BeautySalonContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(BeautySalonContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // --- ВХОД ---
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return Unauthorized("Неверный логин или пароль");

            var key = Encoding.ASCII.GetBytes(_configuration["JwtSettings:SecretKey"]!);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[] {
                    new Claim(ClaimTypes.Name, user.Email),
                    new Claim(ClaimTypes.Role, user.Role),
                    new Claim("LinkedId", user.LinkedId?.ToString() ?? "0")
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);

            return Ok(new
            {
                Token = tokenHandler.WriteToken(token),
                Email = user.Email,
                Role = user.Role,
                BusinessId = user.BusinessId,
                LinkedId = user.LinkedId
            });
        }

        // --- РЕГИСТРАЦИЯ (КЛИЕНТ И ВЛАДЕЛЕЦ) ---
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterModel model)
        {
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
                return BadRequest("Email занят");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var newUser = new User
                {
                    Email = model.Email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
                    Role = model.Role
                };

                // Логика для Владельца
                if (model.Role == "Owner")
                {
                    var newBusiness = new Business
                    {
                        Name = string.IsNullOrEmpty(model.BusinessName) ? "Мой Салон" : model.BusinessName,
                        Address = "Адрес не указан"
                    };
                    _context.Businesses.Add(newBusiness);
                    await _context.SaveChangesAsync();
                    newUser.BusinessId = newBusiness.Id;
                }

                // Логика для Клиента (Исправлено)
                if (model.Role == "Client")
                {
                    var newClient = new Client
                    {
                        Name = model.Email.Split('@')[0], // Берем строку до @
                        Surname = "Клиент"
                    };
                    _context.Clients.Add(newClient);
                    await _context.SaveChangesAsync();
                    newUser.LinkedId = newClient.Id; // Привязываем созданного клиента
                }

                _context.Users.Add(newUser);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Регистрация успешна" });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, "Ошибка: " + ex.Message);
            }
        }

        // --- СОЗДАНИЕ ДОСТУПА ДЛЯ МАСТЕРА ---
        [HttpPost("create-master-access")]
        [Authorize]
        public async Task<IActionResult> CreateMasterAccess([FromBody] MasterAccessModel model)
        {
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
                return BadRequest("Email уже занят");

            var newUser = new User
            {
                Email = model.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
                Role = "Master",
                BusinessId = model.BusinessId,
                LinkedId = model.EmployeeId
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Доступ создан" });
        }

        // --- ПРОФИЛЬ ---
        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            var email = User.Identity?.Name;
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) return NotFound();

            var profile = new UserProfileDto
            {
                Email = user.Email,
                Role = user.Role,
                AvatarUrl = user.AvatarUrl
            };

            if (user.Role == "Client" && user.LinkedId.HasValue)
            {
                var c = await _context.Clients.FindAsync(user.LinkedId.Value);
                if (c != null) { profile.Name = c.Name; profile.Surname = c.Surname; }
            }
            else if (user.Role == "Master" && user.LinkedId.HasValue)
            {
                var m = await _context.Emploees.FindAsync(user.LinkedId.Value);
                if (m != null) { profile.Name = m.Name; profile.Surname = m.Surname; profile.Phone = m.Phone; }
            }
            return Ok(profile);
        }

        [HttpPut("profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UserProfileDto data)
        {
            var email = User.Identity?.Name;
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null || !user.LinkedId.HasValue) return NotFound();

            if (user.Role == "Client")
            {
                var c = await _context.Clients.FindAsync(user.LinkedId.Value);
                if (c != null) { c.Name = data.Name ?? c.Name; c.Surname = data.Surname ?? c.Surname; }
            }
            else if (user.Role == "Master")
            {
                var m = await _context.Emploees.FindAsync(user.LinkedId.Value);
                if (m != null) { m.Name = data.Name ?? m.Name; m.Surname = data.Surname ?? m.Surname; m.Phone = data.Phone ?? m.Phone; }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Обновлено" });
        }

        [HttpPost("upload-avatar")]
        [Authorize]
        public async Task<IActionResult> UploadAvatar(IFormFile file)
        {
            var path = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads/avatars");
            if (!Directory.Exists(path)) Directory.CreateDirectory(path);
            var fileName = Guid.NewGuid() + Path.GetExtension(file.FileName);
            using (var stream = new FileStream(Path.Combine(path, fileName), FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == User.Identity.Name);
            if (user != null) { user.AvatarUrl = $"/uploads/avatars/{fileName}"; await _context.SaveChangesAsync(); }
            return Ok(new { url = user?.AvatarUrl });
        }



        // POST: api/Auth/upload-portfolio
        [HttpPost("upload-portfolio")]
        [Authorize]
        public async Task<IActionResult> UploadPortfolio([FromQuery] int targetId, [FromQuery] string type, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Файл не выбран или пуст.");

            var extension = Path.GetExtension(file.FileName).ToLower();
            if (extension != ".jpg" && extension != ".jpeg" && extension != ".png")
            {
                return BadRequest("Неверный формат изображения. Допустимы только JPG, JPEG, PNG.");
            }

            // Создаем изолированные папки под разные типы портфолио (wwwroot/uploads/portfolio/master и т.д.)
            var folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "portfolio", type);
            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);

            // Генерируем уникальное имя файла с сохранением ID целевого объекта для удобства
            var fileName = $"{type}_{targetId}_{Guid.NewGuid()}{extension}";
            var fullPath = Path.Combine(folderPath, fileName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Формируем относительный URL-путь для сохранения на фронтенде
            var relativeUrl = $"/uploads/portfolio/{type}/{fileName}";

            // Возвращаем JSON, который ожидает получить компонент Ant Design Upload
            return Ok(new { url = relativeUrl });
        }






    }



    // --- МОДЕЛИ ---
    public record LoginRequest(string Email, string Password);
    public class RegisterModel
    {
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string Role { get; set; } = null!;
        public string? BusinessName { get; set; }
    }
    public class MasterAccessModel
    {
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
        public int EmployeeId { get; set; }
        public int BusinessId { get; set; }
    }
    public class UserProfileDto
    {
        public string Email { get; set; } = null!;
        public string Role { get; set; } = null!;
        public string? Name { get; set; }
        public string? Surname { get; set; }
        public string? Phone { get; set; }
        public string? AvatarUrl { get; set; }
    }
}