using Microsoft.EntityFrameworkCore;
using DataEntryAPI.Models; // Adjust this to match your actual namespace

public class DataContext : DbContext
{
    public DataContext(DbContextOptions<DataContext> options) : base(options) { }

    // Existing DbSet properties
    public DbSet<Container> Containers { get; set; }
    public DbSet<Vessel> Vessels { get; set; }
    public DbSet<Terminal> Terminals { get; set; }
    public DbSet<VesselLine> VesselLines { get; set; }
    public DbSet<PortsOfEntry> Ports { get; set; }

    // Add these properly named DbSet properties to match your existing model classes
    public DbSet<Shipline> Shiplines { get; set; }
    public DbSet<Fpm> FPMs { get; set; }
    public DbSet<DropdownOption> DropdownOptions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Existing entity mappings
        modelBuilder.Entity<Container>().ToTable("Containers");
        modelBuilder.Entity<Vessel>().ToTable("Vessels");
        modelBuilder.Entity<Terminal>().ToTable("Terminals");
        modelBuilder.Entity<VesselLine>().ToTable("VesselLines");
        modelBuilder.Entity<PortsOfEntry>().ToTable("Ports");

        // Add these entity mappings
        modelBuilder.Entity<Shipline>().ToTable("Shiplines");
        modelBuilder.Entity<Fpm>().ToTable("FPMs");
        modelBuilder.Entity<DropdownOption>().ToTable("DropdownOptions");
    }
}