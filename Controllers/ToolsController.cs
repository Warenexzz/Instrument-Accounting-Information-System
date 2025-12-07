using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ToolManagementSystem.Data;
using ToolManagementSystem.Models;
using ToolManagementSystem.DTOs;

namespace ToolManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ToolsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ToolsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/tools
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ToolDto>>> GetTools()
        {
            var tools = await _context.Tools
                .Include(t => t.StorageLocation)
                .Select(t => new ToolDto
                {
                    Id = t.Id,
                    Article = t.Article,
                    Name = t.Name,
                    Description = t.Description,
                    StorageLocationId = t.StorageLocationId,
                    StorageLocationName = t.StorageLocation.Name,
                    StorageLocationType = t.StorageLocation.Type
                })
                .ToListAsync();

            return Ok(tools);
        }

        // GET: api/tools/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<ToolDto>> GetTool(int id)
        {
            var tool = await _context.Tools
                .Include(t => t.StorageLocation)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (tool == null)
            {
                return NotFound(new { message = $"Инструмент с ID {id} не найден" });
            }

            var toolDto = new ToolDto
            {
                Id = tool.Id,
                Article = tool.Article,
                Name = tool.Name,
                Description = tool.Description,
                StorageLocationId = tool.StorageLocationId,
                StorageLocationName = tool.StorageLocation.Name,
                StorageLocationType = tool.StorageLocation.Type
            };

            return Ok(toolDto);
        }

        // POST: api/tools
        [HttpPost]
        public async Task<ActionResult<ToolDto>> CreateTool([FromBody] CreateToolDto createDto)
        {
            // Валидация
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Проверяем существование места хранения
            var storageLocation = await _context.StorageLocations
                .FirstOrDefaultAsync(s => s.Id == createDto.StorageLocationId);

            if (storageLocation == null)
            {
                return BadRequest(new { message = $"Место хранения с ID {createDto.StorageLocationId} не найдено" });
            }

            // Создаем инструмент
            var tool = new Tool
            {
                Article = createDto.Article,
                Name = createDto.Name,
                Description = createDto.Description,
                StorageLocationId = createDto.StorageLocationId
            };

            _context.Tools.Add(tool);
            await _context.SaveChangesAsync();

            // Возвращаем созданный инструмент
            var toolDto = new ToolDto
            {
                Id = tool.Id,
                Article = tool.Article,
                Name = tool.Name,
                Description = tool.Description,
                StorageLocationId = tool.StorageLocationId,
                StorageLocationName = storageLocation.Name,
                StorageLocationType = storageLocation.Type
            };

            return CreatedAtAction(nameof(GetTool), new { id = tool.Id }, toolDto);
        }

        [HttpPost("{id}/writeoff")]
        public async Task<IActionResult> WriteOffTool(int id, [FromBody] WriteOffDto writeOffDto)
        {
            var tool = await _context.Tools.FindAsync(id);

            if (tool == null)
                return NotFound(new { message = $"Инструмент с ID {id} не найден" });

            // Создаем транзакцию списания
            var transaction = new ToolTransaction
            {
                ToolId = id,
                UserId = writeOffDto.UserId, // Кто списал
                TransactionType = "Списание",
                TransactionDate = DateTime.UtcNow,
                Quantity = writeOffDto.Quantity,
                Notes = $"Причина: {writeOffDto.Reason}. {writeOffDto.Notes}"
            };

            _context.ToolTransactions.Add(transaction);

            // Если списываем весь инструмент - удаляем его
            if (writeOffDto.WriteOffCompletely)
            {
                _context.Tools.Remove(tool);
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Инструмент списан",
                transactionId = transaction.Id
            });
        }

        public class WriteOffDto
        {
            public int UserId { get; set; }
            public int Quantity { get; set; } = 1;
            public string Reason { get; set; } // "broken", "worn", "lost", "other"
            public string Notes { get; set; }
            public bool WriteOffCompletely { get; set; } = true;
        }

        // PUT: api/tools/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTool(int id, [FromBody] UpdateToolDto updateDto)
        {
            // Валидация
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Находим инструмент
            var tool = await _context.Tools.FindAsync(id);
            if (tool == null)
            {
                return NotFound(new { message = $"Инструмент с ID {id} не найден" });
            }

            // Проверяем новое место хранения (если указано)
            if (updateDto.StorageLocationId.HasValue)
            {
                var storageLocation = await _context.StorageLocations
                    .FirstOrDefaultAsync(s => s.Id == updateDto.StorageLocationId.Value);

                if (storageLocation == null)
                {
                    return BadRequest(new { message = $"Место хранения с ID {updateDto.StorageLocationId} не найдено" });
                }

                tool.StorageLocationId = updateDto.StorageLocationId.Value;
            }

            // Обновляем поля (только если они предоставлены)
            if (!string.IsNullOrEmpty(updateDto.Article))
                tool.Article = updateDto.Article;

            if (!string.IsNullOrEmpty(updateDto.Name))
                tool.Name = updateDto.Name;

            if (updateDto.Description != null) // Разрешаем пустое описание
                tool.Description = updateDto.Description;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ToolExists(id))
                    return NotFound();
                throw;
            }

            return NoContent(); // 204 No Content
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTool(int id)
        {
            var tool = await _context.Tools.FindAsync(id);
            if (tool == null)
            {
                return NotFound(new { message = $"Инструмент с ID {id} не найден" });
            }

            _context.Tools.Remove(tool);
            await _context.SaveChangesAsync();

            return NoContent(); // 204 No Content
        }

        [HttpPatch("{id}")]
        public async Task<IActionResult> PatchTool(int id, [FromBody] Dictionary<string, object> updates)
        {
            var tool = await _context.Tools.FindAsync(id);
            if (tool == null)
            {
                return NotFound(new { message = $"Инструмент с ID {id} не найден" });
            }

            foreach (var update in updates)
            {
                switch (update.Key.ToLower())
                {
                    case "article":
                        tool.Article = update.Value.ToString();
                        break;
                    case "name":
                        tool.Name = update.Value.ToString();
                        break;
                    case "description":
                        tool.Description = update.Value?.ToString();
                        break;
                    case "storagelocationid":
                        if (int.TryParse(update.Value.ToString(), out int locationId))
                        {
                            // Проверяем существование места хранения
                            var locationExists = await _context.StorageLocations
                                .AnyAsync(s => s.Id == locationId);

                            if (!locationExists)
                            {
                                return BadRequest(new { message = $"Место хранения с ID {locationId} не найдено" });
                            }
                            tool.StorageLocationId = locationId;
                        }
                        break;
                }
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }
        private bool ToolExists(int id)
        {
            return _context.Tools.Any(e => e.Id == id);
        }
    }
}