using EarthScan.Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace EarthScan.Backend.Data
{
    public class EarthScanDbContext : DbContext
    {
        public EarthScanDbContext(DbContextOptions<EarthScanDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Land> Lands { get; set; }
        public DbSet<ForumPost> ForumPosts { get; set; }
        public DbSet<ForumComment> ForumComments { get; set; }
        public DbSet<SupportQuery> SupportQueries { get; set; }
        public DbSet<StateGroundwater> StateGroundwaters { get; set; }
        public DbSet<MandiPrice> MandiPrices { get; set; }
        public DbSet<MandiHistory> MandiHistories { get; set; }
        public DbSet<SoilReport> SoilReports { get; set; }
        public DbSet<AIChatHistory> AIChatHistories { get; set; }
        public DbSet<GovernmentScheme> GovernmentSchemes { get; set; }
        public DbSet<UserSearchHistory> UserSearchHistories { get; set; }
        public DbSet<SatbaraRegistry> SatbaraRegistries { get; set; }
        
        // Ensure to run EF migrations after adding these!
        // dotnet ef migrations add AddNewFeatures
        // dotnet ef database update

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
        }
    }
}