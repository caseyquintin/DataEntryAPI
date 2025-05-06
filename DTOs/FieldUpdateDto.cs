namespace DataEntryAPI.DTOs
{
    public class FieldUpdateDto
    {
        public int ContainerID { get; set; }
        public string Field { get; set; } = string.Empty;
        public string? Value { get; set; }
    }
}