using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
public class PortsOfEntry
{   
    [Key]
    public int PortId { get; set; }

    [Column("PortOfEntry")]
    public string? PortOfEntry { get; set; } // Maps to "PortOfEntry" in DB
}