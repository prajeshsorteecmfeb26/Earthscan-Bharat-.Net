using System;
using System.ComponentModel.DataAnnotations;

namespace EarthScan.Backend.Models
{
    public class SupportQuery
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Farmer { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Title { get; set; } = "Support Request";

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Location { get; set; } = "Online";

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // Pending, Answered

        public string? Answer { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
