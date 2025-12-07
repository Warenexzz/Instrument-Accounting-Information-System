using Microsoft.EntityFrameworkCore;
using ToolManagementSystem.Data;
using ToolManagementSystem.Models;

public static class DbInitializer
{
    public static async Task Initialize(AppDbContext context)
    {
        try
        {
            Console.WriteLine("Проверка существования базы данных...");

            // Проверяем, существует ли база данных
            var databaseExists = await context.Database.CanConnectAsync();

            if (!databaseExists)
            {
                Console.WriteLine("База данных не существует. Создаем...");
                await context.Database.EnsureCreatedAsync();
                Console.WriteLine("База данных создана.");
            }
            else
            {
                Console.WriteLine("База данных уже существует.");

                // Применяем миграции, если они есть
                try
                {
                    var pendingMigrations = await context.Database.GetPendingMigrationsAsync();
                    if (pendingMigrations.Any())
                    {
                        Console.WriteLine($"Применяем миграции: {string.Join(", ", pendingMigrations)}");
                        await context.Database.MigrateAsync();
                    }
                    else
                    {
                        Console.WriteLine("Миграций для применения нет.");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Ошибка при применении миграций: {ex.Message}");
                    Console.WriteLine("Продолжаем без миграций...");
                }
            }

            // Проверяем, есть ли пользователи
            var hasUsers = await context.Users.AnyAsync();
            if (!hasUsers)
            {
                Console.WriteLine("Создаем начальные данные...");
                await SeedData(context);
            }
            else
            {
                Console.WriteLine("Начальные данные уже существуют.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка инициализации базы данных: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Внутренняя ошибка: {ex.InnerException.Message}");
            }
        }
    }

    private static async Task SeedData(AppDbContext context)
    {
        try
        {
            Console.WriteLine("Начало создания начальных данных...");

            // Создаем пользователей
            var adminUser = new User
            {
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                FullName = "Администратор Системы",
                Role = "Admin",
                CreatedDate = DateTime.UtcNow
            };

            var storekeeper = new User
            {
                Username = "storekeeper",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("store123"),
                FullName = "Кладовщик Иванов",
                Role = "Storekeeper",
                CreatedDate = DateTime.UtcNow
            };

            var worker1 = new User
            {
                Username = "worker1",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("worker123"),
                FullName = "Рабочий Петров",
                Role = "Worker",
                CreatedDate = DateTime.UtcNow
            };

            var worker2 = new User
            {
                Username = "worker2",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("worker456"),
                FullName = "Рабочий Сидоров",
                Role = "Worker",
                CreatedDate = DateTime.UtcNow
            };

            // Добавляем пользователей по одному
            await context.Users.AddAsync(adminUser);
            await context.SaveChangesAsync();

            await context.Users.AddAsync(storekeeper);
            await context.SaveChangesAsync();

            await context.Users.AddAsync(worker1);
            await context.SaveChangesAsync();

            await context.Users.AddAsync(worker2);
            await context.SaveChangesAsync();

            Console.WriteLine("Пользователи созданы.");

            // Проверяем, есть ли уже места хранения
            var hasLocations = await context.StorageLocations.AnyAsync();
            if (!hasLocations)
            {
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

                // Добавляем места хранения
                await context.StorageLocations.AddAsync(mainStorage);
                await context.SaveChangesAsync();

                await context.StorageLocations.AddAsync(workshop);
                await context.SaveChangesAsync();

                Console.WriteLine("Места хранения созданы.");

                // Теперь создаем инструменты, используя ID созданных мест хранения
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
                    }
                };

                await context.Tools.AddRangeAsync(tools);
                await context.SaveChangesAsync();

                Console.WriteLine("Инструменты созданы.");
            }
            else
            {
                Console.WriteLine("Места хранения уже существуют, пропускаем создание.");
            }

            Console.WriteLine("✅ Начальные данные успешно созданы!");
            Console.WriteLine("===============================");
            Console.WriteLine("Демо доступы:");
            Console.WriteLine("Администратор: admin / admin123");
            Console.WriteLine("Кладовщик: storekeeper / store123");
            Console.WriteLine("Рабочий 1: worker1 / worker123");
            Console.WriteLine("Рабочий 2: worker2 / worker456");
            Console.WriteLine("===============================");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Ошибка создания начальных данных: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Внутренняя ошибка: {ex.InnerException.Message}");
            }
            throw;
        }
    }
}