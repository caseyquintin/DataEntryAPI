using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Data.SqlClient;
using System.Collections.Generic;
using System.Threading.Tasks;

[ApiController]
[Route("api/FPMs")]
public class FPMsController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public FPMsController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<IActionResult> GetShiplines()
    {
        var fpms = new List<object>();
        var connectionString = _configuration.GetConnectionString("DefaultConnection");

        using var conn = new SqlConnection(connectionString);
        using var cmd = new SqlCommand("SELECT Fpm, FpmID, Active FROM FPMs WHERE Active = 1 ORDER BY Fpm", conn);

        try
        {
            await conn.OpenAsync();
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                fpms.Add(new {
                    Id = (int)reader["FpmID"],
                    Name = reader["Fpm"].ToString(),
                    Active = (int)reader["Active"],
                });
            }

            return Ok(fpms);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error fetching fpms: {ex.Message}");
            return StatusCode(500, $"Failed to retrieve fpms: {ex.Message}");
        }
        
    }
}