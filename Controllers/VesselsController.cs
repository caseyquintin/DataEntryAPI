using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DataEntryAPI.DTOs;
using DataEntryAPI.Models; // if needed for your VesselLine model

[ApiController]
[Route("api/vessels")]
public class VesselsController : ControllerBase
{
    private readonly DataContext _context;

    public VesselsController(DataContext context)
    {
        _context = context;
    }

    // GET: api/vessels/by-line/{vesselLineId}
    [HttpGet("by-line/{vesselLineId}")]
    public IActionResult GetVesselsByLine(int vesselLineId)
    {
        var vessels = _context.Vessels
            .Where(v => v.VesselLineID == vesselLineId)
            .Select(v => new {
                vesselID = v.VesselID,
                vesselName = v.VesselName,
                mmsi = v.MMSI,
                imo = v.IMO,
                vesselLine = v.VesselLine
            })
            .ToList();

        return Ok(vessels);
    }
    // File: VesselsController.cs
    // Update the GetVesselLines method to include Link column

    // File: VesselsController.cs
    // Update the GetVesselLines method with a more explicit approach

    [HttpGet("vessel-lines")]
    public IActionResult GetVesselLines()
    {
        var result = _context.VesselLines
            .Select(vl => new
            {
                id = vl.VesselLineID,
                name = vl.vesselLineName,
                link = vl.Link ?? string.Empty,
                // Get the value from the database property
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
}