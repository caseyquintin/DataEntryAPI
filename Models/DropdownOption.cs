using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DataEntryAPI.Models  // Match your actual namespace
{
    [Table("DropdownOptions")]
    public class DropdownOption
    {
        [Key]
        public int Id { get; set; }

        public string Category { get; set; } = string.Empty;

        public string Value { get; set; } = string.Empty;

        public bool? IsActive { get; set; }

        public int? SortOrder { get; set; }
    }
}