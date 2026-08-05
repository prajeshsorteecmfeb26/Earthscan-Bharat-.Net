using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EarthScan.Backend.Models
{
    public class Land
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [Required]
        public string Location { get; set; } = string.Empty;

        public double Latitude { get; set; }
        public double Longitude { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        public double SizeInAcres { get; set; }

        public string SoilType { get; set; } = string.Empty;

        public double GroundwaterLevelDepth { get; set; } // in meters

        // NEW: Fields for Farmer Selling Land Feature
        public string ContactNumber { get; set; } = string.Empty;
        public string? ImagePath { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Decision Engine Generated
        public double LandIntelligenceScore { get; set; }
        public double BorewellSuccessProbability { get; set; }

        // Foreign Key
        public int OwnerId { get; set; }
        [ForeignKey("OwnerId")]
        public User? Owner { get; set; }
    }
}