using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ToolManagementSystem.Models;

namespace ToolManagementSystem.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Tool> Tools { get; set; }
        public DbSet<StorageLocation> StorageLocations { get; set; }
        public DbSet<ToolTransaction> ToolTransactions { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
                optionsBuilder.LogTo(Console.WriteLine, LogLevel.Information)
                             .EnableSensitiveDataLogging();
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {

            modelBuilder.Entity<User>()
                .HasMany(u => u.IssuedTransactions)
                .WithOne(t => t.User)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<User>()
                .HasMany(u => u.ToolAssignments)
                .WithOne(t => t.AssignedToUser)
                .HasForeignKey(t => t.AssignedToUserId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);

            modelBuilder.Entity<Tool>()
                .HasOne(t => t.StorageLocation)
                .WithMany(s => s.Tools)
                .HasForeignKey(t => t.StorageLocationId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ToolTransaction>()
                .HasOne(t => t.Tool)
                .WithMany(t => t.Transactions)
                .HasForeignKey(t => t.ToolId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ToolTransaction>()
                .Property(t => t.TransactionType)
                .HasMaxLength(50);

            modelBuilder.Entity<ToolTransaction>()
                .Property(t => t.Notes)
                .HasMaxLength(1000);

            modelBuilder.Entity<ToolTransaction>()
                .Property(t => t.ReturnNotes)
                .HasMaxLength(1000);

            modelBuilder.Entity<ToolTransaction>()
                .Property(t => t.Condition)
                .HasMaxLength(50);

        }
    }
}