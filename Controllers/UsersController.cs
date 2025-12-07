using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ToolManagementSystem.Data;
using ToolManagementSystem.Models;
using ToolManagementSystem.DTOs;
using BCrypt.Net;

namespace ToolManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/users (только для админа)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers()
        {
            return await _context.Users
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    FullName = u.FullName,
                    Role = u.Role,
                    CreatedDate = u.CreatedDate
                })
                .ToListAsync();
        }

        // GET: api/users/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<UserDto>> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
                return NotFound();

            return new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Role = user.Role,
                CreatedDate = user.CreatedDate
            };
        }

        // POST: api/users/register (регистрация новых пользователей)
        [HttpPost("register")]
        public async Task<ActionResult<UserDto>> Register([FromBody] CreateUserDto createDto)
        {
            // Проверяем, не существует ли уже пользователь
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == createDto.Username);

            if (existingUser != null)
            {
                return BadRequest(new { message = "Пользователь с таким логином уже существует" });
            }

            // Создаем пользователя
            var user = new User
            {
                Username = createDto.Username,
                // ИСПРАВЛЕНИЕ: используем правильный метод хеширования
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(createDto.Password),
                FullName = createDto.FullName,
                Role = createDto.Role,
                CreatedDate = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Role = user.Role,
                CreatedDate = user.CreatedDate
            });
        }

        // PUT: api/users/{id} (обновление пользователя)
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto updateDto)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
                return NotFound();

            // Обновляем данные
            if (!string.IsNullOrEmpty(updateDto.FullName))
                user.FullName = updateDto.FullName;

            if (!string.IsNullOrEmpty(updateDto.Role))
                user.Role = updateDto.Role;

            if (!string.IsNullOrEmpty(updateDto.Password))
                // ИСПРАВЛЕНИЕ: используем правильный метод хеширования
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(updateDto.Password);

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/users/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
                return NotFound();

            // Нельзя удалить самого себя
            var currentUserId = GetCurrentUserId(); // Нужно реализовать получение текущего пользователя
            if (user.Id == currentUserId)
            {
                return BadRequest(new { message = "Нельзя удалить самого себя" });
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/users/roles (получить список доступных ролей)
        [HttpGet("roles")]
        public IActionResult GetRoles()
        {
            var roles = new[]
            {
                new { Id = "Admin", Name = "Администратор" },
                new { Id = "Storekeeper", Name = "Кладовщик" },
                new { Id = "Worker", Name = "Рабочий" }
            };

            return Ok(roles);
        }

        private int GetCurrentUserId()
        {
            // Временная заглушка - в реальном приложении получаем из токена
            return 1; // ID админа
        }
    }
}