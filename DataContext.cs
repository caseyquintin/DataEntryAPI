using Microsoft.EntityFrameworkCore;
using DataEntryAPI.Models; // 👈 or whatever your namespace is

public class DataContext : DbContext
{
    public DataContext(DbContextOptions<DataContext> options) : base(options) { }

    // ✅ Map existing tables correctly
    public DbSet<Container> Containers { get; set; }
    public DbSet<Vessel> Vessels { get; set; }
    public DbSet<Terminal> Terminals { get; set; } // 👈 ✅ Add this line
    public DbSet<VesselLine> VesselLines { get; set; }
    public DbSet<PortsOfEntry> Ports { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ✅ Ensure EF Core uses existing tables instead of creating new ones
        modelBuilder.Entity<Container>().ToTable("Containers");
        modelBuilder.Entity<Vessel>().ToTable("Vessels");
        modelBuilder.Entity<Terminal>().ToTable("Terminals"); // 👈 ✅ Also register this
        modelBuilder.Entity<VesselLine>().ToTable("VesselLines"); // ✅ Matches actual DB table name
        modelBuilder.Entity<PortsOfEntry>().ToTable("Ports"); // ✅ Matches actual DB table name
    }
}