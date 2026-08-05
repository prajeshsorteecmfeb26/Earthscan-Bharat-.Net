using System;
using System.ComponentModel.DataAnnotations;

namespace EarthScan.Backend.Models
{
    public class UserSearchHistory
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(100)]
        public string SearchType { get; set; } = string.Empty; // e.g. "Borewell Planner", "Land Search"

        [Required]
        public string Query { get; set; } = string.Empty; // e.g. "Village: Kalidhon, Maharashtra"

        [Required]
        public string ResultSummary { get; set; } = string.Empty; // e.g. "Depth: 320 feet, Success Rate: 78%"

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
