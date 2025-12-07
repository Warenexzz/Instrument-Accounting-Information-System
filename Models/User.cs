using System.ComponentModel.DataAnnotations;

namespace ToolManagementSystem.Models
{
    public class User
    {
        public int Id { get; set; }

        [Required]
        public string Username { get; set; }

        [Required]
        public string FullName { get; set; }

        public string Email { get; set; }

        [Required]
        public string Role { get; set; }

        [Required]
        public string PasswordHash { get; set; }

        public DateTime CreatedDate { get; set; }

        // Навигационные свойства
        public virtual ICollection<ToolTransaction> IssuedTransactions { get; set; }
        public virtual ICollection<ToolTransaction> ReceivedTransactions { get; set; }
        public virtual ICollection<ToolTransaction> ToolAssignments { get; set; }

        public User()
        {
            IssuedTransactions = new HashSet<ToolTransaction>();
            ReceivedTransactions = new HashSet<ToolTransaction>();
            ToolAssignments = new HashSet<ToolTransaction>();
            CreatedDate = DateTime.UtcNow;
        }
    }
}