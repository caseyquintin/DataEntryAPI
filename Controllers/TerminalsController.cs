using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;
using Microsoft.Data.SqlClient;
using System.Threading.Tasks;
using System;

[ApiController]
[Route("api/terminals")]
public class TerminalsController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public TerminalsController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet("by-port/{portId}")]
    public async Task<IActionResult> GetTerminalsByPort(int portId)
    {
        var results = new List<object>();
        var connectionString = _configuration.GetConnectionString("DefaultConnection");

        using var conn = new SqlConnection(connectionString);
        // Add Link column to the query
        using var cmd = new SqlCommand(@"
        SELECT TerminalID, Terminal, PortID, Link
        FROM Terminals
        WHERE PortID = @PortID
        ORDER BY Terminal
    ", conn);

        cmd.Parameters.AddWithValue("@PortID", portId);

        try
        {
            await conn.OpenAsync();
            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                results.Add(new
                {
                    terminalID = Convert.ToInt32(reader["TerminalID"]),
                    terminal = reader["Terminal"].ToString(),
                    portID = Convert.ToInt32(reader["PortID"]),
                    // Include the link from the database (regular, not dynamic)
                    link = reader["Link"]?.ToString() ?? string.Empty
                });
            }

            return Ok(results);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ SQL Error: {ex.Message}");
            return StatusCode(500, "Failed to fetch terminals");
        }
    }
}