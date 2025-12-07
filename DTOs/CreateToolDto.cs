using System.ComponentModel.DataAnnotations;

namespace ToolManagementSystem.DTOs
{
    public class CreateToolDto
    {
        [Required(ErrorMessage = "Артикул обязателен")]
        [StringLength(50, MinimumLength = 1, ErrorMessage = "Артикул должен содержать от 1 до 50 символов")]
        public string Article { get; set; }

        [Required(ErrorMessage = "Наименование обязательно")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Наименование должно содержать от 1 до 100 символов")]
        public string Name { get; set; }

        [StringLength(500, ErrorMessage = "Описание не должно превышать 500 символов")]
        public string Description { get; set; }

        [Required(ErrorMessage = "ID места хранения обязателен")]
        [Range(1, int.MaxValue, ErrorMessage = "Некорректный ID места хранения")]
        public int StorageLocationId { get; set; }
    }
}