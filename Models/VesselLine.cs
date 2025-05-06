using System.ComponentModel.DataAnnotations.Schema;

namespace DataEntryAPI.Models
{
    public class VesselLine
    {
        public int VesselLineID { get; set; }

        [Column("VesselLine")] // 👈 Maps the property to the actual SQL column
        public string vesselLineName { get; set; } = string.Empty;
    }
}