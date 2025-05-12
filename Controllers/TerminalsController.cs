// File: Controllers/TerminalsController.cs

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;
using Microsoft.Data.SqlClient;
using System.Threading.Tasks;
using System;
using DataEntryAPI.DTOs; // Add this import

[ApiController]
[Route("api/terminals")]
public class TerminalsController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public TerminalsController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    // Keep your existing endpoints...

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
                    // Include the link from the database
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

    // PATCH: api/terminals/{id}
    [HttpPatch("{id}")]
    public async Task<IActionResult> UpdateTerminal(int id, [FromBody] TerminalUpdateDto update)
    {
        if (update == null)
            return BadRequest("Invalid update data");

        var connectionString = _configuration.GetConnectionString("DefaultConnection");
        using var conn = new SqlConnection(connectionString);

        // Make sure we only update terminals with the specified ID and PortID for safety
        using var cmd = new SqlCommand(@"
            UPDATE Terminals 
            SET Link = @Link
            WHERE TerminalID = @ID AND PortID = @PortID",
            conn);

        cmd.Parameters.AddWithValue("@ID", id);
        cmd.Parameters.AddWithValue("@PortID", update.PortId);
        cmd.Parameters.AddWithValue("@Link", update.Link ?? (object)DBNull.Value);

        try
        {
            await conn.OpenAsync();
            var rowsAffected = await cmd.ExecuteNonQueryAsync();

            if (rowsAffected == 0)
                return NotFound($"Terminal with ID {id} and PortID {update.PortId} not found");

            return Ok(new { message = "Terminal updated successfully" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ SQL Error: {ex.Message}");
            return StatusCode(500, $"Error updating terminal: {ex.Message}");
        }
    }

    // PUT: api/terminals/batch-update
    [HttpPut("batch-update")]
    public async Task<IActionResult> BatchUpdateTerminals([FromBody] List<TerminalUpdateDto> updates)
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

                using var cmd = new SqlCommand(@"
                    UPDATE Terminals 
                    SET Link = @Link
                    WHERE TerminalID = @ID AND PortID = @PortID",
                    conn, transaction);

                cmd.Parameters.AddWithValue("@ID", update.Id.Value);
                cmd.Parameters.AddWithValue("@PortID", update.PortId);
                cmd.Parameters.AddWithValue("@Link", update.Link ?? (object)DBNull.Value);

                await cmd.ExecuteNonQueryAsync();
            }

            transaction.Commit();
            return Ok(new { message = "Batch update successful" });
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            Console.WriteLine($"❌ SQL Error: {ex.Message}");
            return StatusCode(500, $"Error in batch update: {ex.Message}");
        }
    }
}