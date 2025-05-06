using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("Terminals")]
public class Terminal
{
    [Key]
    public int TerminalID { get; set; }

    [Column("Terminal")]
    public string TerminalName { get; set; } = string.Empty;  // ✅ Renamed from Terminal → TerminalName

    public int PortID { get; set; }
}