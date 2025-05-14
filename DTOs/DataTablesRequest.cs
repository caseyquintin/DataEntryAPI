public class DataTablesRequest
{
    public int Draw { get; set; }
    public int Start { get; set; }
    public int Length { get; set; }
    public SearchData? Search { get; set; }

    public class SearchData
    {
        public string? Value { get; set; }
        public bool Regex { get; set; }
    }
}