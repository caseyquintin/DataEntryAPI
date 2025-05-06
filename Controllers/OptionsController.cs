using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;

[ApiController]
[Route("api/options")]
public class OptionsController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public OptionsController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet("{type}")]
    public async Task<IActionResult> GetOptions(string type)
    {
        var results = new List<string>();

        var connectionString = _configuration.GetConnectionString("DefaultConnection");

        using var conn = new SqlConnection(connectionString);
        using var cmd = new SqlCommand("GetDropdownOptions", conn)
        {
            CommandType = CommandType.StoredProcedure
        };

        cmd.Parameters.Add("@Category", SqlDbType.VarChar, 50).Value = type ?? (object)DBNull.Value;

        try
        {
            await conn.OpenAsync();
            using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            var value = reader["Value"]?.ToString();
            if (!string.IsNullOrEmpty(value))
            {
                results.Add(value);
            }
        }

            return Ok(results);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ SQL Error: {ex.Message}");
            return StatusCode(500, "Error fetching dropdown data");
        }
    }
}