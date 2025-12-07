using Microsoft.EntityFrameworkCore;
using ToolManagementSystem.Data;
using ToolManagementSystem.Models;

var builder = WebApplication.CreateBuilder(args);

// Конфигурация
var configuration = builder.Configuration;

// Добавление контекста базы данных
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

// Добавление контроллеров
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// Настройка CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
});

// Настройка Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Настройка конвейера запросов
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Включаем статические файлы
app.UseDefaultFiles();
app.UseStaticFiles();

// Создание базы данных и начальных данных
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Автоматическое создание БД
    try
    {
        await dbContext.Database.EnsureCreatedAsync();
        Console.WriteLine("База данных создана/проверена успешно");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Ошибка создания БД: {ex.Message}");
    }

    // Инициализация данных
    await SeedData(dbContext);
}

app.Run();

// Функция для начального заполнения данных
async Task SeedData(AppDbContext context)
{
    try
    {
        // Проверяем, есть ли уже пользователи
        if (!await context.Users.AnyAsync())
        {
            Console.WriteLine("Создание начальных данных...");

            // Создаем администратора по умолчанию
            var adminUser = new User
            {
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                FullName = "Администратор Системы",
                Email = "admin@system.local",
                Role = "Admin",
                CreatedDate = DateTime.UtcNow
            };

            // Создаем кладовщика по умолчанию
            var storekeeper = new User
            {
                Username = "storekeeper",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("store123"),
                FullName = "Кладовщик Иванов",
                Email = "storekeeper@system.local",
                Role = "Storekeeper",
                CreatedDate = DateTime.UtcNow
            };

            // Создаем рабочих по умолчанию
            var worker1 = new User
            {
                Username = "worker1",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("worker123"),
                FullName = "Рабочий Петров",
                Email = "worker1@system.local",
                Role = "Worker",
                CreatedDate = DateTime.UtcNow
            };

            var worker2 = new User
            {
                Username = "worker2",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("worker456"),
                FullName = "Рабочий Сидоров",
                Email = "worker2@system.local",
                Role = "Worker",
                CreatedDate = DateTime.UtcNow
            };

            context.Users.AddRange(adminUser, storekeeper, worker1, worker2);
            await context.SaveChangesAsync();
            Console.WriteLine("✅ Создано 4 пользователя по умолчанию");

            // Создаем места хранения
            var mainStorage = new StorageLocation
            {
                Type = "Склад",
                Name = "Основной склад",
                Address = "Корпус А, этаж 1"
            };

            var workshop = new StorageLocation
            {
                Type = "Цех",
                Name = "Сборочный цех",
                Address = "Корпус Б, этаж 2"
            };

            var cabinet = new StorageLocation
            {
                Type = "Шкаф",
                Name = "Инструментальный шкаф №1",
                Address = "Корпус В, комната 101"
            };

            context.StorageLocations.AddRange(mainStorage, workshop, cabinet);
            await context.SaveChangesAsync();
            Console.WriteLine("✅ Создано 3 места хранения");

            // Создаем инструменты
            var tools = new List<Tool>
            {
                new Tool
                {
                    Article = "HAM-001",
                    Name = "Молоток слесарный",
                    Description = "Молоток 500г, деревянная ручка",
                    StorageLocationId = mainStorage.Id
                },
                new Tool
                {
                    Article = "SCR-002",
                    Name = "Отвертка крестовая",
                    Description = "Набор отверток 6 предметов",
                    StorageLocationId = mainStorage.Id
                },
                new Tool
                {
                    Article = "WRN-003",
                    Name = "Гаечный ключ",
                    Description = "Набор гаечных ключей 8-19мм",
                    StorageLocationId = workshop.Id
                },
                new Tool
                {
                    Article = "DRL-004",
                    Name = "Дрель электрическая",
                    Description = "Дрель Makita 650Вт",
                    StorageLocationId = cabinet.Id
                },
                new Tool
                {
                    Article = "SAW-005",
                    Name = "Ножовка по металлу",
                    Description = "Ножовка 300мм, сменные полотна",
                    StorageLocationId = mainStorage.Id
                }
            };

            context.Tools.AddRange(tools);
            await context.SaveChangesAsync();
            Console.WriteLine("✅ Создано 5 инструментов");

            // Создаем тестовые транзакции
            var transactions = new List<ToolTransaction>
            {
                // Приёмка инструментов
                new ToolTransaction
                {
                    ToolId = 1,
                    UserId = adminUser.Id,
                    TransactionType = "Приёмка",
                    TransactionDate = DateTime.UtcNow.AddDays(-30),
                    Quantity = 5,
                    Notes = "Первоначальная закупка"
                },
                new ToolTransaction
                {
                    ToolId = 2,
                    UserId = adminUser.Id,
                    TransactionType = "Приёмка",
                    TransactionDate = DateTime.UtcNow.AddDays(-28),
                    Quantity = 10,
                    Notes = "Закупка инструмента"
                },
                // Выдачи инструментов
                new ToolTransaction
                {
                    ToolId = 1,
                    UserId = storekeeper.Id,
                    AssignedToUserId = worker1.Id,
                    TransactionType = "Выдача",
                    TransactionDate = DateTime.UtcNow.AddDays(-7),
                    Quantity = 1,
                    Notes = "Для работ на участке №1",
                    ExpectedReturnDate = DateTime.UtcNow.AddDays(7)
                },
                new ToolTransaction
                {
                    ToolId = 3,
                    UserId = storekeeper.Id,
                    AssignedToUserId = worker2.Id,
                    TransactionType = "Выдача",
                    TransactionDate = DateTime.UtcNow.AddDays(-3),
                    Quantity = 1,
                    Notes = "Монтажные работы",
                    ExpectedReturnDate = DateTime.UtcNow.AddDays(10)
                },
                // Возврат инструмента
                new ToolTransaction
                {
                    ToolId = 4,
                    UserId = storekeeper.Id,
                    AssignedToUserId = worker1.Id,
                    TransactionType = "Возврат",
                    TransactionDate = DateTime.UtcNow.AddDays(-1),
                    Quantity = 1,
                    Notes = "Возврат после ремонтных работ",
                    Condition = "good",
                    ReturnNotes = "Инструмент в хорошем состоянии"
                }
            };

            context.ToolTransactions.AddRange(transactions);
            await context.SaveChangesAsync();
            Console.WriteLine("✅ Создано 5 тестовых транзакций");

            Console.WriteLine("\n🎉 Начальные данные успешно созданы!");
            Console.WriteLine("══════════════════════════════════════════");
            Console.WriteLine("👤 Администратор: admin / admin123");
            Console.WriteLine("📦 Кладовщик: storekeeper / store123");
            Console.WriteLine("👷 Рабочие: worker1 / worker123, worker2 / worker456");
            Console.WriteLine("══════════════════════════════════════════");
        }
        else
        {
            Console.WriteLine("📊 База данных уже содержит данные. Пропускаем создание начальных данных.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Ошибка при создании начальных данных: {ex.Message}");
    }
}