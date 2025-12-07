using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace ToolManagementSystem.Models
{
    public class Tool
    {
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string Article { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; }

        [StringLength(500)]
        public string Description { get; set; }

        [Required]
        public int StorageLocationId { get; set; }

        // Навигационное свойство - игнорируем при сериализации и валидации
        [JsonIgnore]
        [ValidateNever]
        [ForeignKey("StorageLocationId")]
        public StorageLocation StorageLocation { get; set; }

        [JsonIgnore]
        public List<ToolTransaction> Transactions { get; set; }

        public Tool()
        {
            Transactions = new List<ToolTransaction>();
        }
    }
}