using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("Shiplines")]
public class Shipline
{
    [Key]
    public int ShiplineID { get; set; }

    [Column("Shipline")]
    public string ShiplineName { get; set; } = string.Empty;

    public string? Link { get; set; }

    // Add this property
    public bool IsDynamicLink { get; set; }
}