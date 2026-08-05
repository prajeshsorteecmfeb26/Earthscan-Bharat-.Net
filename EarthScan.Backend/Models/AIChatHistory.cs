using System;

namespace EarthScan.Backend.Models
{
    public class AIChatHistory
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Question { get; set; } = string.Empty;
        public string Answer { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
