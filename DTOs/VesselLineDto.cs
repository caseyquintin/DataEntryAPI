// File: DTOs/VesselLineDto.cs
namespace DataEntryAPI.DTOs
{
    public class VesselLineUpdateDto
    {
        public int? Id { get; set; }
        public string? Link { get; set; }
        public bool IsDynamicLink { get; set; }
    }
}