using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;

namespace ToolManagementSystem.Models
{
    public class StorageLocation
    {
        public int Id { get; set; }

        [Required]
        public string Type { get; set; } // "Склад", "Цех", "Шкаф"

        [Required]
        public string Name { get; set; }

        public string Address { get; set; }

        // Навигационное свойство - игнорируем при сериализации
        [JsonIgnore]
        public List<Tool> Tools { get; set; }

        public StorageLocation()
        {
            Tools = new List<Tool>();
        }
    }
}