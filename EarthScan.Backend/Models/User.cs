using System.ComponentModel.DataAnnotations;

namespace EarthScan.Backend.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Role { get; set; } = "Farmer"; // Farmer, Land Buyer, Agriculture Expert, Admin

        // NEW: Farmer Profile Enhancements
        public string? ProfilePicturePath { get; set; }
        public string? Phone { get; set; }
        public string? Location { get; set; }
        public string? FarmingInformation { get; set; }
        public string? FavoriteCropsJson { get; set; } // Stored as JSON string
        public string? FavoriteLandsJson { get; set; } // Stored as JSON string

        public string? Pincode { get; set; }
        public string? Village { get; set; }
        public string? Taluka { get; set; }
        public string? District { get; set; }
        public string? StateName { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }
}