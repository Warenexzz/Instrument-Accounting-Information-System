namespace ToolManagementSystem.DTOs
{
    public class ToolDto
    {
        public int Id { get; set; }
        public string Article { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public int StorageLocationId { get; set; }
        public string StorageLocationName { get; set; }
        public string StorageLocationType { get; set; }
    }
}