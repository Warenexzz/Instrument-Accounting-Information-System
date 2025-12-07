using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ToolManagementSystem.Data;
using ToolManagementSystem.Models;

namespace ToolManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StorageLocationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StorageLocationsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/storagelocations
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetStorageLocations()
        {
            var locations = await _context.StorageLocations
                .Select(l => new
                {
                    l.Id,
                    l.Type,
                    l.Name,
                    l.Address,
                    ToolsCount = l.Tools.Count
                })
                .ToListAsync();

            return Ok(locations);
        }

        // GET: api/storagelocations/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetStorageLocation(int id)
        {
            var location = await _context.StorageLocations
                .Include(l => l.Tools)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (location == null)
                return NotFound();

            return new
            {
                location.Id,
                location.Type,
                location.Name,
                location.Address,
                Tools = location.Tools.Select(t => new
                {
                    t.Id,
                    t.Article,
                    t.Name
                })
            };
        }

        // POST: api/storagelocations
        [HttpPost]
        public async Task<ActionResult<StorageLocation>> CreateStorageLocation(StorageLocation location)
        {
            _context.StorageLocations.Add(location);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetStorageLocation), new { id = location.Id }, location);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStorageLocation(int id, [FromBody] UpdateStorageLocationDto updateDto)
        {
            var location = await _context.StorageLocations.FindAsync(id);

            if (location == null)
                return NotFound();

            if (!string.IsNullOrEmpty(updateDto.Type))
                location.Type = updateDto.Type;

            if (!string.IsNullOrEmpty(updateDto.Name))
                location.Name = updateDto.Name;

            if (updateDto.Address != null)
                location.Address = updateDto.Address;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/storagelocations/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteStorageLocation(int id)
        {
            var location = await _context.StorageLocations
                .Include(l => l.Tools)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (location == null)
                return NotFound();

            // Проверяем, нет ли инструментов на этом месте хранения
            if (location.Tools.Any())
            {
                return BadRequest(new
                {
                    message = "Нельзя удалить место хранения, на котором есть инструменты",
                    toolsCount = location.Tools.Count
                });
            }

            _context.StorageLocations.Remove(location);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/storagelocations/types (получить типы мест хранения)
        [HttpGet("types")]
        public IActionResult GetStorageLocationTypes()
        {
            var types = new[]
            {
                new { Id = "Склад", Name = "Склад" },
                new { Id = "Цех", Name = "Цех" },
                new { Id = "Шкаф", Name = "Шкаф" },
                new { Id = "Ящик", Name = "Ящик" },
                new { Id = "Стеллаж", Name = "Стеллаж" }
            };

            return Ok(types);
        }

        public class UpdateStorageLocationDto
        {
            public string Type { get; set; }
            public string Name { get; set; }
            public string Address { get; set; }
        }

    }
}