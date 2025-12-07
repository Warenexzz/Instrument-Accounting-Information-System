namespace ToolManagementSystem.Models
{
    public class ToolTransaction
    {
        public int Id { get; set; }
        public int ToolId { get; set; }
        public int UserId { get; set; } // Кто совершил операцию
        public int? AssignedToUserId { get; set; } // Кому выдали (если выдача)
        public string TransactionType { get; set; } // "Приёмка", "Выдача", "Возврат", "Списание"
        public DateTime TransactionDate { get; set; }
        public DateTime? ExpectedReturnDate { get; set; }
        public DateTime? ReturnedDate { get; set; }
        public int Quantity { get; set; } = 1;
        public string Notes { get; set; }
        public string ReturnNotes { get; set; }
        public string Condition { get; set; } // Состояние при возврате
        public int? RelatedTransactionId { get; set; } // ID связанной транзакции

        // Навигационные свойства
        public Tool Tool { get; set; }
        public User User { get; set; } // Кто выполнил операцию
        public User AssignedToUser { get; set; } // Кому выдали

        public ToolTransaction()
        {
            TransactionDate = DateTime.Now;
        }
    }
}