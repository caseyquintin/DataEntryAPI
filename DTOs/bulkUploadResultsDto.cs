namespace DataEntryAPI.DTOs
{
    public class BulkUploadResultDto
    {
        public int TotalProcessed { get; set; }
        public int SuccessCount { get; set; }
        public int ErrorCount { get; set; }
        public List<UploadError> Errors { get; set; } = new List<UploadError>();
    }

    public class UploadError
    {
        public int Row { get; set; }
        public string? Message { get; set; }
    }
}