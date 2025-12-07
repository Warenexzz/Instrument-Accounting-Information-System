using Microsoft.AspNetCore.Mvc;
using ToolManagementSystem.Models;
using ToolManagementSystem.Data;
using Microsoft.EntityFrameworkCore;

namespace ToolManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuthController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
        {
            // Проверка существования пользователя
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == registerDto.Username);

            if (existingUser != null)
                return BadRequest("Пользователь уже существует");

            // Создаем пользователя
            var user = new User
            {
                Username = registerDto.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password),
                FullName = registerDto.FullName,
                Role = registerDto.Role,
                CreatedDate = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Пользователь создан",
                userId = user.Id,
                username = user.Username,
                role = user.Role,
                fullName = user.FullName
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel login)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == login.Username);

            if (user == null || !BCrypt.Net.BCrypt.Verify(login.Password, user.PasswordHash))
                return Unauthorized(new { message = "Неверные учетные данные" });

            // Здесь будет генерация JWT токена
            // Временный токен для демо
            var token = $"demo-token-{user.Id}-{DateTime.UtcNow.Ticks}";

            return Ok(new
            {
                token = token,
                userId = user.Id,
                username = user.Username,
                role = user.Role,
                fullName = user.FullName,
                message = "Успешный вход"
            });
        }

        // Добавим эндпоинт для проверки доступности API
        [HttpGet("health")]
        public IActionResult HealthCheck()
        {
            return Ok(new
            {
                status = "running",
                timestamp = DateTime.UtcNow,
                version = "1.0.0"
            });
        }
    }

    public class LoginModel
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }

    public class RegisterDto
    {
        public string Username { get; set; }
        public string Password { get; set; }
        public string FullName { get; set; }
        public string Role { get; set; }
    }
}