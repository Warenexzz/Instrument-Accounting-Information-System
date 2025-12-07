using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ToolManagementSystem.Data;
using ToolManagementSystem.Models;
using ToolManagementSystem.DTOs;

namespace ToolManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OperationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OperationsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/operations/active
        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<object>>> GetActiveIssues()
        {
            try
            {
                var now = DateTime.UtcNow;

                var activeIssues = await _context.ToolTransactions
                    .Where(t => t.TransactionType == "Выдача" && t.ReturnedDate == null)
                    .Include(t => t.Tool)
                    .Include(t => t.AssignedToUser)
                    .Include(t => t.User)
                    .ToListAsync();

                var result = activeIssues.Select(t => new
                {
                    TransactionId = t.Id,
                    Tool = t.Tool != null ? new { t.Tool.Id, t.Tool.Article, t.Tool.Name } : null,
                    Worker = t.AssignedToUser != null ? new { t.AssignedToUser.Id, t.AssignedToUser.FullName } : null,
                    IssuedBy = t.User != null ? new { t.User.Id, t.User.FullName } : null,
                    TransactionDate = t.TransactionDate,
                    ExpectedReturnDate = t.ExpectedReturnDate,
                    Quantity = t.Quantity,
                    Notes = t.Notes,
                    DaysIssued = (now - t.TransactionDate).Days
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка в GetActiveIssues: {ex.Message}");
                return StatusCode(500, new { message = "Ошибка сервера", details = ex.Message });
            }
        }

        // POST: api/operations/issue
        [HttpPost("issue")]
        public async Task<IActionResult> IssueTool([FromBody] IssueToolDto issueDto)
        {
            try
            {
                // Находим инструмент
                var tool = await _context.Tools.FindAsync(issueDto.ToolId);
                if (tool == null)
                    return BadRequest(new { message = "Инструмент не найден" });

                // Проверяем рабочего
                var worker = await _context.Users.FindAsync(issueDto.WorkerId);
                if (worker == null || worker.Role != "Worker")
                    return BadRequest(new { message = "Рабочий не найден или не является рабочим" });

                // Проверяем, кто выдает
                var issuer = await _context.Users.FindAsync(issueDto.IssuedById);
                if (issuer == null || (issuer.Role != "Storekeeper" && issuer.Role != "Admin"))
                    return BadRequest(new { message = "Только кладовщик или администратор может выдавать инструмент" });

                // Создаем транзакцию выдачи
                var transactionEntity = new ToolTransaction
                {
                    ToolId = issueDto.ToolId,
                    UserId = issueDto.IssuedById,
                    AssignedToUserId = issueDto.WorkerId,
                    TransactionType = "Выдача",
                    TransactionDate = DateTime.UtcNow,
                    Quantity = issueDto.Quantity,
                    Notes = issueDto.Notes,
                    ExpectedReturnDate = issueDto.ExpectedReturnDate?.ToUniversalTime(),
                    ReturnNotes = "",
                    Condition = ""
                };

                _context.ToolTransactions.Add(transactionEntity);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Инструмент выдан",
                    transactionId = transactionEntity.Id,
                    toolName = tool.Name,
                    workerName = worker.FullName,
                    issuedByName = issuer.FullName
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка в IssueTool: {ex.Message}");
                return StatusCode(500, new { message = "Ошибка сервера", details = ex.Message });
            }
        }

        // GET: api/operations/stats
        [HttpGet("stats")]
        public async Task<ActionResult<object>> GetOperationsStats()
        {
            try
            {
                var today = DateTime.UtcNow.Date;
                var now = DateTime.UtcNow;

                // Вычисляем статистику по отдельности, чтобы избежать сложных LINQ
                var totalTransactions = await _context.ToolTransactions.CountAsync();

                var issuesToday = await _context.ToolTransactions
                    .CountAsync(t => t.TransactionType == "Выдача" &&
                                    t.TransactionDate.Date == today);

                var returnsToday = await _context.ToolTransactions
                    .CountAsync(t => t.TransactionType == "Возврат" &&
                                    t.TransactionDate.Date == today);

                var activeIssues = await _context.ToolTransactions
                    .CountAsync(t => t.TransactionType == "Выдача" && t.ReturnedDate == null);

                // Для просроченных - сначала получаем список, потом фильтруем
                var allIssues = await _context.ToolTransactions
                    .Where(t => t.TransactionType == "Выдача" && t.ReturnedDate == null)
                    .ToListAsync();

                var overdueIssues = allIssues.Count(t =>
                    t.ExpectedReturnDate.HasValue &&
                    t.ExpectedReturnDate.Value < now);

                var stats = new
                {
                    TotalTransactions = totalTransactions,
                    IssuesToday = issuesToday,
                    ReturnsToday = returnsToday,
                    ActiveIssues = activeIssues,
                    OverdueIssues = overdueIssues
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка в GetOperationsStats: {ex.Message}");
                return StatusCode(500, new { message = "Ошибка сервера", details = ex.Message });
            }
        }

        // GET: api/operations/transactions/recent
        [HttpGet("transactions/recent")]
        public async Task<ActionResult<IEnumerable<object>>> GetRecentTransactions([FromQuery] int limit = 10)
        {
            try
            {
                var transactions = await _context.ToolTransactions
                    .Include(t => t.Tool)
                    .Include(t => t.User)
                    .Include(t => t.AssignedToUser)
                    .OrderByDescending(t => t.TransactionDate)
                    .Take(limit)
                    .Select(t => new
                    {
                        t.Id,
                        t.TransactionType,
                        t.TransactionDate,
                        t.Quantity,
                        t.Notes,
                        Tool = t.Tool != null ? new { t.Tool.Id, t.Tool.Name, t.Tool.Article } : null,
                        User = t.User != null ? new { t.User.Id, t.User.FullName } : null,
                        AssignedToUser = t.AssignedToUser != null ? new { t.AssignedToUser.Id, t.AssignedToUser.FullName } : null
                    })
                    .ToListAsync();

                return Ok(transactions);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка в GetRecentTransactions: {ex.Message}");
                return StatusCode(500, new { message = "Ошибка сервера", details = ex.Message });
            }
        }

        // GET: api/operations/user/{userId}/active
        [HttpGet("user/{userId}/active")]
        public async Task<ActionResult<IEnumerable<object>>> GetUserActiveTools(int userId)
        {
            try
            {
                var now = DateTime.UtcNow;

                var activeTools = await _context.ToolTransactions
                    .Where(t => t.AssignedToUserId == userId &&
                               t.TransactionType == "Выдача" &&
                               t.ReturnedDate == null)
                    .Include(t => t.Tool)
                    .Select(t => new
                    {
                        t.ToolId,
                        ToolName = t.Tool != null ? t.Tool.Name : "Неизвестно",
                        Article = t.Tool != null ? t.Tool.Article : "",
                        IssueDate = t.TransactionDate,
                        t.ExpectedReturnDate,
                        IsOverdue = t.ExpectedReturnDate.HasValue && t.ExpectedReturnDate.Value < now
                    })
                    .ToListAsync();

                return Ok(activeTools);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка в GetUserActiveTools: {ex.Message}");
                return StatusCode(500, new { message = "Ошибка сервера", details = ex.Message });
            }
        }

        // POST: api/operations/return
        [HttpPost("return")]
        public async Task<IActionResult> ReturnTool([FromBody] ReturnToolDto returnDto)
        {
            try
            {
                // Находим последнюю выдачу
                var lastIssue = await _context.ToolTransactions
                    .Where(t => t.ToolId == returnDto.ToolId &&
                               t.AssignedToUserId == returnDto.WorkerId &&
                               t.TransactionType == "Выдача" &&
                               t.ReturnedDate == null)
                    .OrderByDescending(t => t.TransactionDate)
                    .FirstOrDefaultAsync();

                if (lastIssue == null)
                    return BadRequest(new { message = "Не найдена выдача для возврата" });

                // Проверяем, кто принимает возврат
                var returnReceiver = await _context.Users.FindAsync(returnDto.ReturnedById);
                if (returnReceiver == null || (returnReceiver.Role != "Storekeeper" && returnReceiver.Role != "Admin"))
                    return BadRequest(new { message = "Только кладовщик или администратор может принимать возврат" });

                // Отмечаем возврат
                lastIssue.ReturnedDate = DateTime.UtcNow;
                lastIssue.ReturnNotes = returnDto.Notes;
                lastIssue.Condition = returnDto.Condition;

                // Создаем транзакцию возврата
                var returnTransaction = new ToolTransaction
                {
                    ToolId = returnDto.ToolId,
                    UserId = returnDto.ReturnedById,
                    AssignedToUserId = returnDto.WorkerId,
                    TransactionType = "Возврат",
                    TransactionDate = DateTime.UtcNow,
                    Quantity = lastIssue.Quantity,
                    Notes = $"Возврат. Состояние: {returnDto.Condition}. Примечания: {returnDto.Notes}",
                    ReturnNotes = returnDto.Notes,
                    Condition = returnDto.Condition,
                    RelatedTransactionId = lastIssue.Id
                };

                _context.ToolTransactions.Add(returnTransaction);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Инструмент возвращен",
                    transactionId = returnTransaction.Id,
                    returnedDate = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка в ReturnTool: {ex.Message}");
                return StatusCode(500, new { message = "Ошибка сервера", details = ex.Message });
            }
        }

        // Остальные методы (ReceiveTool, GetToolHistory) остаются аналогичными

        // Классы DTO
        public class IssueToolDto
        {
            public int ToolId { get; set; }
            public int WorkerId { get; set; }
            public int IssuedById { get; set; }
            public int Quantity { get; set; } = 1;
            public string Notes { get; set; }
            public DateTime? ExpectedReturnDate { get; set; }
        }

        public class ReturnToolDto
        {
            public int ToolId { get; set; }
            public int WorkerId { get; set; }
            public int ReturnedById { get; set; }
            public string Condition { get; set; }
            public string Notes { get; set; }
        }

        public class ReceiveToolDto
        {
            public string Article { get; set; }
            public string Name { get; set; }
            public string Description { get; set; }
            public int StorageLocationId { get; set; }
            public int ReceivedById { get; set; }
            public int Quantity { get; set; } = 1;
            public string Notes { get; set; }
        }
    }
}