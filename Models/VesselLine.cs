using System.ComponentModel.DataAnnotations.Schema;

namespace DataEntryAPI.Models
{
    public class VesselLine
    {
        public int VesselLineID { get; set; }

        [Column("VesselLine")]
        public string vesselLineName { get; set; } = string.Empty;

        public string? Link { get; set; }

        // Add this property
        public bool IsDynamicLink { get; set; }
    }
}