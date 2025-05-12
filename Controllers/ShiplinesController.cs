using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Data.SqlClient;
using System.Collections.Generic;
using System.Threading.Tasks;

[ApiController]
[Route("api/shiplines")]
public class ShiplinesController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public ShiplinesController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<IActionResult> GetShiplines()
    {
        var shiplines = new List<object>();
        var connectionString = _configuration.GetConnectionString("DefaultConnection");

        using var conn = new SqlConnection(connectionString);
        using var cmd = new SqlCommand("SELECT Shipline, ShiplineID, Link FROM Shiplines ORDER BY ShiplineID", conn);

        try
        {
            await conn.OpenAsync();
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                shiplines.Add(new {
                    Id = (int)reader["ShiplineID"],
                    Name = reader["Shipline"].ToString(),
                    Link = reader["Link"]?.ToString() ?? string.Empty,
                    // Add a flag if the link appears to be a template (contains a placeholder)
                    IsLinkTemplate = (reader["Link"]?.ToString() ?? string.Empty).Contains("container=\\r") ||
                                    (reader["Link"]?.ToString() ?? string.Empty).Contains("{container}")
                });
            }

            return Ok(shiplines);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error fetching shiplines: {ex.Message}");
            return StatusCode(500, $"Failed to retrieve shiplines: {ex.Message}");
        }
        
    }
}