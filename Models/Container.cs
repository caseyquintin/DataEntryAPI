using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization; // 🧠 ADD THIS LINE

[Table("Containers")]  // Explicitly maps to the existing SQL table
public class Container
{
    [Key]
    public int ContainerID { get; set; }  // Primary Key
    public string? FPM { get; set; }
    public string? ProjectNumber { get; set; }
    [Column("Container")]  // Maps to SQL column "Container"
    [JsonPropertyName("Container")] 
    public string? ContainerNumber { get; set; }
    public string? Shipline { get; set; }
    public string? ContainerSize { get; set; }
    public string? CurrentStatus { get; set; }
    public string? ShipmentNumber { get; set; }
    public string? PONumber { get; set; }
    public string? Vendor { get; set; }
    public string? VendorIDNumber { get; set; }
    public DateTime? Sail { get; set; }
    public string? Carrier { get; set; }
    public int? CarrierID { get; set; }
    public DateTime? Arrival { get; set; }
    public DateTime? Offload { get; set; }
    public string? PortOfEntry { get; set; }
    public string? Terminal { get; set; }
    public string? BOLBookingNumber { get; set; }
    public DateTime? Available { get; set; }
    public DateTime? PickupLFD { get; set; }
    public DateTime? PortRailwayPickup { get; set; }
    public DateTime? ReturnLFD { get; set; }
    public DateTime? Delivered { get; set; }
    public DateTime? Returned { get; set; }
    public string? Notes { get; set; }
    
    public string? SailActual { get; set; }
    public string? BerthActual { get; set; }
    public string? ArrivalActual { get; set; }
    public string? OffloadActual { get; set; }
    public DateTime? LastUpdated { get; set; }
    
    public string? MainSource { get; set; }
    public string? PortOfDeparture { get; set; }
    
    public string? Rail { get; set; }  // Assuming Rail is a Yes/No field
    public string? RailDestination { get; set; }
    public string? RailwayLine { get; set; }
    public DateTime? LoadToRail { get; set; }
    public DateTime? RailDeparture { get; set; }
    public DateTime? RailETA { get; set; }
    public string? Transload { get; set; }  // Assuming Transload is a Yes/No field
    public string? RailPickupNumber { get; set; }
    
    public DateTime? Berth { get; set; }
    public string? VesselLine { get; set; }
    public string? VesselName { get; set; }
    public string? Voyage { get; set; }

    // Foreign Keys (Assuming they relate to other tables)
    public int? ShiplineID { get; set; }
    public int? TerminalID { get; set; }
    public int? VesselLineID { get; set; }
    public int? VesselID { get; set; }
    public int? PortID { get; set;}
    public int? FpmID { get; set; }
}