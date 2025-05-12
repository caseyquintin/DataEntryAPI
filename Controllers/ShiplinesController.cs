using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Data.SqlClient;
using System.Collections.Generic;
using System.Threading.Tasks;
using DataEntryAPI.DTOs;

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
        // Updated query to include IsDynamicLink column
        using var cmd = new SqlCommand("SELECT Shipline, ShiplineID, Link, IsDynamicLink FROM Shiplines ORDER BY ShiplineID", conn);

        try
        {
            await conn.OpenAsync();
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                shiplines.Add(new
                {
                    Id = (int)reader["ShiplineID"],
                    Name = reader["Shipline"].ToString(),
                    Link = reader["Link"]?.ToString() ?? string.Empty,
                    // Get the value from the database column
                    IsDynamicLink = Convert.ToBoolean(reader["IsDynamicLink"])
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

    [HttpPatch("{id}")]
    public async Task<IActionResult> UpdateShipline(int id, [FromBody] ShiplineUpdateDto update)
    {
        if (update == null)
            return BadRequest("Invalid update data");

        var connectionString = _configuration.GetConnectionString("DefaultConnection");
        using var conn = new SqlConnection(connectionString);
        using var cmd = new SqlCommand(
            "UPDATE Shiplines SET Link = @Link, IsDynamicLink = @IsDynamicLink WHERE ShiplineID = @ID",
            conn);

        cmd.Parameters.AddWithValue("@ID", id);
        cmd.Parameters.AddWithValue("@Link", update.Link ?? (object)DBNull.Value);
        cmd.Parameters.AddWithValue("@IsDynamicLink", update.IsDynamicLink);

        try
        {
            await conn.OpenAsync();
            var rowsAffected = await cmd.ExecuteNonQueryAsync();

            if (rowsAffected == 0)
                return NotFound($"Shipline with ID {id} not found");

            return Ok(new { message = "Shipline updated successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error updating shipline: {ex.Message}");
        }
    }

    [HttpPut("batch-update")]
    public async Task<IActionResult> BatchUpdateShiplines([FromBody] List<ShiplineUpdateDto> updates)
    {
        if (updates == null || !updates.Any())
            return BadRequest("No updates provided");

        var connectionString = _configuration.GetConnectionString("DefaultConnection");
        using var conn = new SqlConnection(connectionString);
        await conn.OpenAsync();

        using var transaction = conn.BeginTransaction();

        try
        {
            foreach (var update in updates)
            {
                if (!update.Id.HasValue) continue;

                using var cmd = new SqlCommand(
                    "UPDATE Shiplines SET Link = @Link, IsDynamicLink = @IsDynamicLink WHERE ShiplineID = @ID",
                    conn, transaction);

                cmd.Parameters.AddWithValue("@ID", update.Id.Value);
                cmd.Parameters.AddWithValue("@Link", update.Link ?? (object)DBNull.Value);
                cmd.Parameters.AddWithValue("@IsDynamicLink", update.IsDynamicLink);

                await cmd.ExecuteNonQueryAsync();
            }

            transaction.Commit();
            return Ok(new { message = "Batch update successful" });
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            return StatusCode(500, $"Error in batch update: {ex.Message}");
        }
    }
}