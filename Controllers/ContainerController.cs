using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using DataEntryAPI.DTOs;
using Microsoft.Extensions.Configuration;
using Microsoft.Data.SqlClient;
using System;
using System.Text.Json;
using Microsoft.AspNetCore.Http; // New for IFormFile
using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;
using System.IO;
using System.Transactions;
using System.Text;  // For StringBuilder

[ApiController]
[Route("api/containers")]
public class ContainerController : ControllerBase
{
    private readonly DataContext _context;
    private readonly IConfiguration _configuration; // ✅ Add this

    public ContainerController(DataContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration; // ✅ Save the config for use
    }

    // 🔹 GET: api/containers (Retrieve all containers)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetContainers()
    {
        var containers = await _context.Containers
            .Select(c => new
            {
                c.ContainerID,
                c.FPM,
                c.FpmID,
                c.ProjectNumber,
                c.ContainerNumber,
                c.Shipline,
                c.ContainerSize,
                c.CurrentStatus,
                c.ShipmentNumber,
                c.PONumber,
                c.Vendor,
                c.VendorIDNumber,
                c.Sail,
                c.Carrier,
                c.CarrierID,
                c.Arrival,
                c.Offload,
                PortOfEntry = c.PortID != null
                    ? _context.Ports
                        .Where(p => p.PortId == c.PortID)
                        .Select(p => p.PortOfEntry)
                        .FirstOrDefault()
                    : c.PortID.ToString(), // ✅ now both branches are strings
                // ✅ Use TerminalID to lookup the real terminal name
                Terminal = c.TerminalID != null
                    ? _context.Terminals
                        .Where(t => t.TerminalID == c.TerminalID)
                        .Select(t => t.TerminalName)
                        .FirstOrDefault()
                    : c.Terminal,
                c.TerminalID,
                c.BOLBookingNumber,
                c.Available,
                c.PickupLFD,
                c.PortRailwayPickup,
                c.ReturnLFD,
                c.Delivered,
                c.Returned,
                c.Notes,
                c.SailActual,
                c.BerthActual,
                c.ArrivalActual,
                c.OffloadActual,
                c.LastUpdated,
                c.MainSource,
                c.PortOfDeparture,
                c.Rail,
                c.RailDestination,
                c.RailwayLine,
                c.LoadToRail,
                c.RailDeparture,
                c.RailETA,
                c.Transload,
                c.RailPickupNumber,
                c.Berth,
                c.VesselLine,
                c.VesselName,
                c.Voyage,
                c.ShiplineID,
                c.VesselLineID,
                c.VesselID,
                c.PortID
            })
            .ToListAsync();

        return Ok(containers);
    }

    // 🔹 GET: api/containers/{id} (Retrieve a single container by ID)
    [HttpGet("{id}")]
    public async Task<ActionResult<Container>> GetContainer(int id)
    {
        var container = await _context.Containers.FindAsync(id);

        if (container == null)
        {
            return NotFound();  // 404 if container is not found
        }

        return container;
    }

    // 🔹 POST: api/containers (Insert a new container)
    [HttpPost]
    public async Task<IActionResult> CreateContainer([FromBody] Container newContainer)
    {
        var sql = @"
            INSERT INTO Containers 
            (Container, CurrentStatus, ContainerSize, MainSource, Transload, Shipline, ShiplineID, BOLBookingNumber, Rail, RailDestination, RailwayLine, LoadToRail, RailDeparture, RailETA, RailPickupNumber, FPM, FpmID, ProjectNumber, ShipmentNumber, PONumber, Vendor, VendorIDNumber, VesselLine, VesselLineID, VesselName, VesselID, Voyage, PortOfDeparture, Sail, SailActual, PortOfEntry, PortID, Terminal, TerminalID, Arrival, ArrivalActual, Berth, BerthActual, Offload, OffloadActual, Carrier, CarrierID, Available, PickupLFD, PortRailwayPickup, ReturnLFD, Delivered, Returned, Notes, LastUpdated)
            VALUES 
            (@Container, @CurrentStatus, @ContainerSize, @MainSource, @Transload, @Shipline, @ShiplineID, @BOLBookingNumber, @Rail, @RailDestination, @RailwayLine, @LoadToRail, @RailDeparture, @RailETA, @RailPickupNumber, @FPM, @FpmID, @ProjectNumber, @ShipmentNumber, @PONumber, @Vendor, @VendorIDNumber, @VesselLine, @VesselLineID, @VesselName, @VesselID, @Voyage, @PortOfDeparture, @Sail, @SailActual, @PortOfEntry, @PortID, @Terminal, @TerminalID, @Arrival, @ArrivalActual, @Berth, @BerthActual, @Offload, @OffloadActual, @Carrier, @CarrierID, @Available, @PickupLFD, @PortRailwayPickup, @ReturnLFD, @Delivered, @Returned, @Notes, @LastUpdated)";

        using var conn = new SqlConnection(_configuration.GetConnectionString("DefaultConnection"));
        using var cmd = new SqlCommand(sql, conn);

        // 🛠 Correct parameters:
        cmd.Parameters.AddWithValue("@Container", newContainer.ContainerNumber ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@CurrentStatus", newContainer.CurrentStatus ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@ContainerSize", newContainer.ContainerSize ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@MainSource", newContainer.MainSource ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@Transload", newContainer.Transload ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@Shipline", newContainer.Shipline ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@ShiplineID", newContainer.ShiplineID ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@BOLBookingNumber", newContainer.BOLBookingNumber ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@Rail", newContainer.Rail ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@RailDestination", newContainer.RailDestination ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@RailwayLine", newContainer.RailwayLine ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@LoadToRail", newContainer.LoadToRail ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@RailDeparture", newContainer.RailDeparture ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@RailETA", newContainer.RailETA ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@RailPickupNumber", newContainer.RailPickupNumber ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@FPM", newContainer.FPM ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@FpmID", newContainer.FpmID ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@ProjectNumber", newContainer.ProjectNumber ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@ShipmentNumber", newContainer.ShipmentNumber ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@PONumber", newContainer.PONumber ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@Vendor", newContainer.Vendor ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@VendorIDNumber", newContainer.VendorIDNumber ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@VesselLine", newContainer.VesselLine ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@VesselLineID", newContainer.VesselLineID ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@VesselName", newContainer.VesselName ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@VesselID", newContainer.VesselID ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@Voyage", newContainer.Voyage ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@PortOfDeparture", newContainer.PortOfDeparture ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@Sail", newContainer.Sail ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@SailActual", newContainer.SailActual ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@PortOfEntry", newContainer.PortOfEntry ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@PortID", newContainer.PortID ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@Terminal", newContainer.Terminal ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@TerminalID", newContainer.TerminalID ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@Arrival", newContainer.Arrival ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@ArrivalActual", newContainer.ArrivalActual ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@Berth", newContainer.Berth ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@BerthActual", newContainer.BerthActual ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@Offload", newContainer.Offload ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@OffloadActual", newContainer.OffloadActual ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@Carrier", newContainer.Carrier ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@CarrierID", newContainer.CarrierID ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@Available", newContainer.Available ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@PickupLFD", newContainer.PickupLFD ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@PortRailwayPickup", newContainer.PortRailwayPickup ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@ReturnLFD", newContainer.ReturnLFD ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@Delivered", newContainer.Delivered ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@Returned", newContainer.Returned ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@Notes", newContainer.Notes ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@LastUpdated", newContainer.LastUpdated ?? (object)DBNull.Value);

        try
        {
            cmd.CommandText += "; SELECT SCOPE_IDENTITY();";
            await conn.OpenAsync();
            var insertedId = Convert.ToInt32(await cmd.ExecuteScalarAsync());

            return Ok(new { containerID = insertedId }); // ✅ Return new ID to JS
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error inserting container: {ex.Message}");
            return StatusCode(500, "Failed to insert container.");
        }

    }

    [HttpPatch("update-field")]
    public async Task<IActionResult> UpdateField([FromBody] FieldUpdateDto update)
    {
        if (update == null || update.ContainerID == 0 || string.IsNullOrWhiteSpace(update.Field))
            return BadRequest("Invalid payload.");

        var container = await _context.Containers.FindAsync(update.ContainerID);
        if (container == null)
            return NotFound($"Container with ID {update.ContainerID} not found.");

        var property = typeof(Container).GetProperty(update.Field, System.Reflection.BindingFlags.IgnoreCase | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
        if (property == null)
            return BadRequest($"Property '{update.Field}' does not exist.");

        try
        {
            object? convertedValue;

            // Handle different property types
            if (property.PropertyType == typeof(string))
            {
                // For string properties, if Value is null or whitespace, set to null
                // This allows clearing of string fields
                convertedValue = string.IsNullOrWhiteSpace(update.Value) ? null : update.Value;
            }
            else if (property.PropertyType == typeof(DateTime?) || property.PropertyType == typeof(DateTime))
            {
                convertedValue = string.IsNullOrWhiteSpace(update.Value)
                    ? null
                    : DateTime.Parse(update.Value);
            }
            else if (property.PropertyType == typeof(int?))
            {
                convertedValue = string.IsNullOrWhiteSpace(update.Value)
                    ? null
                    : int.Parse(update.Value);
            }
            else
            {
                // For other types, if the value is null or empty, set to null
                convertedValue = string.IsNullOrWhiteSpace(update.Value)
                    ? null
                    : Convert.ChangeType(update.Value, property.PropertyType);
            }

            // Check if the value is actually changing
            var currentValue = property.GetValue(container);
            if (currentValue?.ToString() == convertedValue?.ToString())
            {
                // Value hasn't changed, return success without updating
                return Ok(new { message = "No change needed." });
            }

            property.SetValue(container, convertedValue);

            // ✅ NEW: Auto-update LastUpdated if it's not the field being updated
            if (!update.Field.Equals("LastUpdated", StringComparison.OrdinalIgnoreCase))
            {
                container.LastUpdated = DateTime.Now;
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Field updated successfully." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error updating field: {ex.Message}");
        }
    }

    [HttpPut("batch-update")]
    public async Task<IActionResult> BatchUpdate([FromBody] List<Dictionary<string, object>> containerUpdates)
    {
        if (containerUpdates == null || !containerUpdates.Any())
            return BadRequest("No containers provided.");

        foreach (var update in containerUpdates)
        {
            if (!update.TryGetValue("containerID", out var idObj) || idObj is not JsonElement idElement || !idElement.TryGetInt32(out int containerID))
                return BadRequest("Missing or invalid containerID.");

            var container = await _context.Containers.FindAsync(containerID);
            if (container == null)
                return NotFound($"ContainerID {containerID} not found.");

            foreach (var kvp in update)
            {
                if (kvp.Key.Equals("containerID", StringComparison.OrdinalIgnoreCase)) continue;

                var property = typeof(Container).GetProperty(kvp.Key, System.Reflection.BindingFlags.IgnoreCase | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
                if (property == null) continue;

                object? valueToSet = null;

                var rawValue = (kvp.Value as JsonElement?) ?? default;
                try
                {
                    if (property.PropertyType == typeof(string))
                        valueToSet = rawValue.GetString();
                    else if (property.PropertyType == typeof(int?))
                        valueToSet = rawValue.ValueKind == JsonValueKind.Null ? null : rawValue.GetInt32();
                    else if (property.PropertyType == typeof(DateTime?))
                        valueToSet = rawValue.ValueKind == JsonValueKind.Null ? null : rawValue.GetDateTime();
                    else if (property.PropertyType == typeof(bool?))
                        valueToSet = rawValue.ValueKind == JsonValueKind.Null ? null : rawValue.GetBoolean();
                    else
                        valueToSet = Convert.ChangeType(rawValue.ToString(), property.PropertyType);

                    property.SetValue(container, valueToSet);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"⚠️ Failed to set property '{kvp.Key}' for ContainerID {containerID}: {ex.Message}");
                }
            }

            _context.Entry(container).State = EntityState.Modified;
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Batch update successful!" });
    }

    // 🔹 DELETE: api/containers/{id} (Delete a container)
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteContainer(int id)
    {
        var container = await _context.Containers.FindAsync(id);
        if (container == null)
        {
            return NotFound();  // 404 if container not found
        }

        _context.Containers.Remove(container);
        await _context.SaveChangesAsync();

        return NoContent();  // 204 if delete was successful
    }

    // ✅ Helper method to check if a container exists
    private bool ContainerExists(int id)
    {
        return _context.Containers.Any(e => e.ContainerID == id);
    }

    [HttpPost("bulk-upload")]
    public async Task<IActionResult> BulkUpload(IFormFile file, [FromForm] bool updateExisting = false)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file was uploaded.");

        var errors = new List<object>();
        var successCount = 0;
        var errorCount = 0;
        var totalRows = 0;

        try
        {
            using (var reader = new StreamReader(file.OpenReadStream()))
            {
                string content = await reader.ReadToEndAsync();
                string[] lines = content.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);

                if (lines.Length <= 1)
                    return BadRequest("CSV file has no data rows.");

                string[] headers = lines[0].Split(',');

                for (int i = 1; i < lines.Length; i++)
                {
                    totalRows++;

                    try
                    {
                        string[] values = ParseCsvLine(lines[i]);

                        var container = new Container();

                        // First, extract container number to check for existing
                        string? containerNumber = null;
                        for (int j = 0; j < Math.Min(headers.Length, values.Length); j++)
                        {
                            if (headers[j].Trim().ToLower() == "container")
                            {
                                containerNumber = values[j].Trim();
                                break;
                            }
                        }

                        // Find existing container if update requested
                        if (updateExisting && !string.IsNullOrEmpty(containerNumber))
                        {
                            var existingContainer = await _context.Containers
                                .FirstOrDefaultAsync(c => c.ContainerNumber == containerNumber);

                            if (existingContainer != null)
                            {
                                container = existingContainer;
                            }
                        }

                        // Process all fields from CSV
                        for (int j = 0; j < Math.Min(headers.Length, values.Length); j++)
                        {
                            string header = headers[j].Trim();
                            string value = values[j].Trim();

                            if (string.IsNullOrEmpty(value))
                                continue;

                            // Handle each field with detailed mapping
                            // This comprehensive mapping is essential for capturing all data
                            switch (header.ToLower())
                            {
                                case "container":
                                    container.ContainerNumber = value;
                                    break;

                                case "currentstatus":
                                    container.CurrentStatus = value;
                                    break;

                                case "containersize":
                                    container.ContainerSize = value;
                                    break;

                                case "mainsource":
                                    container.MainSource = value;
                                    break;

                                case "transload":
                                    container.Transload = value;
                                    break;

                                case "shipline":
                                    container.Shipline = value;
                                    // Find matching shipline ID
                                    var shipline = await _context.Shiplines
                                        .FirstOrDefaultAsync(s => s.ShiplineName == value);
                                    if (shipline != null)
                                        container.ShiplineID = shipline.ShiplineID;
                                    break;

                                case "bolbookingnumber":
                                    container.BOLBookingNumber = value;
                                    break;

                                case "rail":
                                    container.Rail = value;
                                    break;

                                case "raildestination":
                                    container.RailDestination = value;
                                    break;

                                case "railwayline":
                                    container.RailwayLine = value;
                                    break;

                                case "loadtorail":
                                    if (DateTime.TryParse(value, out DateTime loadToRail))
                                        container.LoadToRail = loadToRail;
                                    break;

                                case "raildeparture":
                                    if (DateTime.TryParse(value, out DateTime railDeparture))
                                        container.RailDeparture = railDeparture;
                                    break;

                                case "raileta":
                                    if (DateTime.TryParse(value, out DateTime railEta))
                                        container.RailETA = railEta;
                                    break;

                                case "railpickupnumber":
                                    container.RailPickupNumber = value;
                                    break;

                                case "fpm":
                                    container.FPM = value;
                                    // Find matching FPM ID
                                    var fpm = await _context.FPMs
                                        .FirstOrDefaultAsync(f => f.FpmName == value);
                                    if (fpm != null)
                                        container.FpmID = fpm.FpmID;
                                    break;

                                case "projectnumber":
                                    container.ProjectNumber = value;
                                    break;

                                case "shipmentnumber":
                                    container.ShipmentNumber = value;
                                    break;

                                case "ponumber":
                                    container.PONumber = value;
                                    break;

                                case "vendor":
                                    container.Vendor = value;
                                    break;

                                case "vendoridnumber":
                                    container.VendorIDNumber = value;
                                    break;

                                case "vesselline":
                                    container.VesselLine = value;
                                    // Find matching vessel line ID
                                    var vesselLine = await _context.VesselLines
                                        .FirstOrDefaultAsync(v => v.vesselLineName == value);
                                    if (vesselLine != null)
                                        container.VesselLineID = vesselLine.VesselLineID;
                                    break;

                                case "vesselname":
                                    container.VesselName = value;
                                    // Find matching vessel ID if vessel line ID has been set
                                    if (container.VesselLineID.HasValue)
                                    {
                                        var vessel = await _context.Vessels
                                            .FirstOrDefaultAsync(v =>
                                                v.VesselName == value &&
                                                v.VesselLineID == container.VesselLineID);
                                        if (vessel != null)
                                            container.VesselID = vessel.VesselID;
                                    }
                                    break;

                                case "voyage":
                                    container.Voyage = value;
                                    break;

                                case "portofdeparture":
                                    container.PortOfDeparture = value;
                                    break;

                                case "sail":
                                    if (DateTime.TryParse(value, out DateTime sail))
                                        container.Sail = sail;
                                    break;

                                case "sailactual":
                                    container.SailActual = value;
                                    break;

                                case "portofentry":
                                    container.PortOfEntry = value;
                                    // Find matching port ID
                                    var port = await _context.Ports
                                        .FirstOrDefaultAsync(p => p.PortOfEntry == value);
                                    if (port != null)
                                        container.PortID = port.PortId;
                                    break;

                                case "terminal":
                                    container.Terminal = value;
                                    // Find matching terminal ID if port ID has been set
                                    if (container.PortID.HasValue)
                                    {
                                        var terminal = await _context.Terminals
                                            .FirstOrDefaultAsync(t =>
                                                t.TerminalName == value &&
                                                t.PortID == container.PortID);
                                        if (terminal != null)
                                            container.TerminalID = terminal.TerminalID;
                                    }
                                    break;

                                case "arrival":
                                    if (DateTime.TryParse(value, out DateTime arrival))
                                        container.Arrival = arrival;
                                    break;

                                case "arrivalactual":
                                    container.ArrivalActual = value;
                                    break;

                                case "berth":
                                    if (DateTime.TryParse(value, out DateTime berth))
                                        container.Berth = berth;
                                    break;

                                case "berthactual":
                                    container.BerthActual = value;
                                    break;

                                case "offload":
                                    if (DateTime.TryParse(value, out DateTime offload))
                                        container.Offload = offload;
                                    break;

                                case "offloadactual":
                                    container.OffloadActual = value;
                                    break;

                                case "carrier":
                                    container.Carrier = value;
                                    // Find matching carrier ID from dropdown options
                                    var carrier = await _context.DropdownOptions
                                        .FirstOrDefaultAsync(d =>
                                            d.Category == "Carrier" &&
                                            d.Value == value);
                                    if (carrier != null)
                                        container.CarrierID = carrier.Id;
                                    break;

                                case "available":
                                    if (DateTime.TryParse(value, out DateTime available))
                                        container.Available = available;
                                    break;

                                case "pickuplfd":
                                    if (DateTime.TryParse(value, out DateTime pickupLfd))
                                        container.PickupLFD = pickupLfd;
                                    break;

                                case "portrailwaypickup":
                                    if (DateTime.TryParse(value, out DateTime portRailwayPickup))
                                        container.PortRailwayPickup = portRailwayPickup;
                                    break;

                                case "returnlfd":
                                    if (DateTime.TryParse(value, out DateTime returnLfd))
                                        container.ReturnLFD = returnLfd;
                                    break;

                                case "delivered":
                                    if (DateTime.TryParse(value, out DateTime delivered))
                                        container.Delivered = delivered;
                                    break;

                                case "returned":
                                    if (DateTime.TryParse(value, out DateTime returned))
                                        container.Returned = returned;
                                    break;

                                case "notes":
                                    container.Notes = value;
                                    break;
                            }
                        }

                        // Always set/update LastUpdated
                        container.LastUpdated = DateTime.Now;

                        // Save or update the container
                        if (updateExisting && container.ContainerID > 0)
                        {
                            _context.Entry(container).State = EntityState.Modified;
                        }
                        else
                        {
                            await _context.Containers.AddAsync(container);
                        }

                        await _context.SaveChangesAsync();
                        successCount++;
                    }
                    catch (Exception ex)
                    {
                        errorCount++;
                        errors.Add(new
                        {
                            Row = i,
                            Line = lines[i],
                            Message = ex.Message
                        });
                    }
                }
            }

            var result = new
            {
                TotalProcessed = totalRows,
                SuccessCount = successCount,
                ErrorCount = errorCount,
                Errors = errors
            };
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                Message = $"Failed to process CSV file: {ex.Message}",
                TotalProcessed = totalRows,
                SuccessCount = successCount,
                ErrorCount = errorCount,
                Errors = errors
            });
        }
    }

    // Helper method to parse CSV lines (handles quoted values properly)
    private string[] ParseCsvLine(string line)
    {
        List<string> result = new List<string>();
        bool inQuotes = false;
        StringBuilder field = new StringBuilder();

        foreach (char c in line)
        {
            if (c == '"')
            {
                inQuotes = !inQuotes;
            }
            else if (c == ',' && !inQuotes)
            {
                result.Add(field.ToString());
                field.Clear();
            }
            else
            {
                field.Append(c);
            }
        }

        // Add the last field
        result.Add(field.ToString());
        return result.ToArray();
    }

    [HttpPost("search")]
    public async Task<ActionResult<IEnumerable<object>>> SearchContainers([FromBody] Dictionary<string, string> searchCriteria)
    {
        try
        {
            // Start with base query
            IQueryable<Container> query = _context.Containers;

            // Apply filters based on provided criteria
            foreach (var criterion in searchCriteria)
            {
                string key = criterion.Key;
                string value = criterion.Value?.Trim() ?? string.Empty;

                if (string.IsNullOrEmpty(value))
                    continue;

                // Handle different search fields
                switch (key.ToLower())
                {
                    case "containernumber":
                        query = query.Where(c => c.ContainerNumber != null && c.ContainerNumber.Contains(value));
                        break;

                    case "currentstatus":
                        query = query.Where(c => c.CurrentStatus == value);
                        break;

                    case "bolbookingnumber":
                        query = query.Where(c => c.BOLBookingNumber != null && c.BOLBookingNumber.Contains(value));
                        break;

                    case "projectnumber":
                        query = query.Where(c => c.ProjectNumber != null && c.ProjectNumber.Contains(value));
                        break;

                    case "ponumber":
                        query = query.Where(c => c.PONumber != null && c.PONumber.Contains(value));
                        break;

                    case "vendor":
                        query = query.Where(c => c.Vendor != null && c.Vendor.Contains(value));
                        break;

                    case "shipline":
                        query = query.Where(c => c.Shipline == value);
                        break;

                    case "vesselname":
                        query = query.Where(c => c.VesselName != null && c.VesselName.Contains(value));
                        break;

                    case "portofentry":
                        query = query.Where(c => c.PortOfEntry == value);
                        break;

                    // Handle date ranges
                    case "sailfrom":
                        if (DateTime.TryParse(value, out DateTime sailFrom))
                            query = query.Where(c => c.Sail >= sailFrom);
                        break;

                    case "sailto":
                        if (DateTime.TryParse(value, out DateTime sailTo))
                            query = query.Where(c => c.Sail <= sailTo);
                        break;

                    case "arrivalfrom":
                        if (DateTime.TryParse(value, out DateTime arrivalFrom))
                            query = query.Where(c => c.Arrival >= arrivalFrom);
                        break;

                    case "arrivalto":
                        if (DateTime.TryParse(value, out DateTime arrivalTo))
                            query = query.Where(c => c.Arrival <= arrivalTo);
                        break;
                }
            }

            // Get final results
            var results = await query
                .Select(c => new
                {
                    c.ContainerID,
                    c.FPM,
                    c.FpmID,
                    c.ProjectNumber,
                    c.ContainerNumber,
                    c.Shipline,
                    c.ContainerSize,
                    c.CurrentStatus,
                    c.ShipmentNumber,
                    c.PONumber,
                    c.Vendor,
                    c.VendorIDNumber,
                    c.Sail,
                    c.Carrier,
                    c.CarrierID,
                    c.Arrival,
                    c.Offload,
                    PortOfEntry = c.PortID != null
                        ? _context.Ports
                            .Where(p => p.PortId == c.PortID)
                            .Select(p => p.PortOfEntry)
                            .FirstOrDefault()
                        : c.PortOfEntry,
                    Terminal = c.TerminalID != null
                        ? _context.Terminals
                            .Where(t => t.TerminalID == c.TerminalID)
                            .Select(t => t.TerminalName)
                            .FirstOrDefault()
                        : c.Terminal,
                    c.TerminalID,
                    c.BOLBookingNumber,
                    c.Available,
                    c.PickupLFD,
                    c.PortRailwayPickup,
                    c.ReturnLFD,
                    c.Delivered,
                    c.Returned,
                    c.Notes,
                    c.SailActual,
                    c.BerthActual,
                    c.ArrivalActual,
                    c.OffloadActual,
                    c.LastUpdated,
                    c.MainSource,
                    c.PortOfDeparture,
                    c.Rail,
                    c.RailDestination,
                    c.RailwayLine,
                    c.LoadToRail,
                    c.RailDeparture,
                    c.RailETA,
                    c.Transload,
                    c.RailPickupNumber,
                    c.Berth,
                    c.VesselLine,
                    c.VesselName,
                    c.Voyage,
                    c.ShiplineID,
                    c.VesselLineID,
                    c.VesselID,
                    c.PortID
                })
                .ToListAsync();

            // Return the results
            return Ok(results);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error searching containers: {ex.Message}");
        }
    }
}