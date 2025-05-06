using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("Vessels")]
public class Vessel
{
    [Key]
    public int? VesselID { get; set; }

    public string? VesselName { get; set; }
    public int? VesselLineID { get; set; }

    // ✅ Add these fields
    public string? MMSI { get; set; }
    public string? IMO { get; set; }
    public string? VesselLine { get; set; }
}
