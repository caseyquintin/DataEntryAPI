using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Data.SqlClient;
using System.Collections.Generic;
using System.Threading.Tasks;

[ApiController]
[Route("api/ports")]
public class PortsController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public PortsController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<IActionResult> GetPorts()
    {
        var ports = new List<object>();
        var connectionString = _configuration.GetConnectionString("DefaultConnection");

        using var conn = new SqlConnection(connectionString);
        using var cmd = new SqlCommand("SELECT PortID, PortOfEntry FROM Ports ORDER BY PortOfEntry", conn);

        try
        {
            await conn.OpenAsync();
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                ports.Add(new {
                    Id = (int)reader["PortID"],
                    Name = reader["PortOfEntry"].ToString()
                });
            }

            return Ok(ports);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error fetching ports: {ex.Message}");
            return StatusCode(500, $"Failed to retrieve ports: {ex.Message}");
        }
        
    }
}