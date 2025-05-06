using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("Shiplines")]
public class Shipline
{
    [Key]
    public int ShiplineID { get; set; }

    [Column("Shipline")]
    public string ShiplineName { get; set; } = string.Empty;

}