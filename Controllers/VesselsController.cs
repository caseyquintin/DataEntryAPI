// File: Controllers/VesselsController.cs

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DataEntryAPI.DTOs;
using DataEntryAPI.Models; // For VesselLine model

[ApiController]
[Route("api/vessels")]
public class VesselsController : ControllerBase
{
    private readonly DataContext _context;

    public VesselsController(DataContext context)
    {
        _context = context;
    }

    // Keep your existing endpoints...

    // GET: api/vessels/by-line/{vesselLineId}
    [HttpGet("by-line/{vesselLineId}")]
    public IActionResult GetVesselsByLine(int vesselLineId)
    {
        var vessels = _context.Vessels
            .Where(v => v.VesselLineID == vesselLineId)
            .Select(v => new
            {
                vesselID = v.VesselID,
                vesselName = v.VesselName,
                mmsi = v.MMSI,
                imo = v.IMO,
                vesselLine = v.VesselLine
            })
            .ToList();

        return Ok(vessels);
    }

    // GET: api/vessels/vessel-lines
    [HttpGet("vessel-lines")]
    public IActionResult GetVesselLines()
    {
        var result = _context.VesselLines
            .Select(vl => new
            {
                id = vl.VesselLineID,
                name = vl.vesselLineName,
                link = vl.Link ?? string.Empty,
                isDynamicLink = vl.IsDynamicLink
            })
            .OrderBy(v =>
                v.name == "UNKNOWN" ? "0" :
                v.name == "NOT ASSIGNED" ? "2" :
                "1" + v.name
            )
            .ToList();

        return Ok(result);
    }

    // PATCH: api/vessels/vessel-lines/{id}
    [HttpPatch("vessel-lines/{id}")]
    public async Task<IActionResult> UpdateVesselLine(int id, [FromBody] VesselLineUpdateDto update)
    {
        if (update == null)
            return BadRequest("Invalid update data");

        var vesselLine = await _context.VesselLines.FindAsync(id);
        if (vesselLine == null)
            return NotFound($"Vessel line with ID {id} not found");

        // Update the properties
        vesselLine.Link = update.Link;
        vesselLine.IsDynamicLink = update.IsDynamicLink;

        try
        {
            _context.Entry(vesselLine).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Vessel line updated successfully" });
        }
        catch (DbUpdateException ex)
        {
            return StatusCode(500, $"Error updating vessel line: {ex.Message}");
        }
    }

    // PUT: api/vessels/vessel-lines/batch-update
    [HttpPut("vessel-lines/batch-update")]
    public async Task<IActionResult> BatchUpdateVesselLines([FromBody] List<VesselLineUpdateDto> updates)
    {
        if (updates == null || !updates.Any())
            return BadRequest("No updates provided");

        foreach (var update in updates)
        {
            if (!update.Id.HasValue) continue;

            var vesselLine = await _context.VesselLines.FindAsync(update.Id.Value);
            if (vesselLine == null) continue;

            vesselLine.Link = update.Link;
            vesselLine.IsDynamicLink = update.IsDynamicLink;
            _context.Entry(vesselLine).State = EntityState.Modified;
        }

        try
        {
            await _context.SaveChangesAsync();
            return Ok(new { message = "Batch update successful" });
        }
        catch (DbUpdateException ex)
        {
            return StatusCode(500, $"Error in batch update: {ex.Message}");
        }
    }
}