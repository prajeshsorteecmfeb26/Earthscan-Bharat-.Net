using System;

namespace EarthScan.Backend.Models
{
    public class SoilReport
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public double Nitrogen { get; set; }
        public double Phosphorus { get; set; }
        public double Potassium { get; set; }
        public double Ph { get; set; }
        public string SoilType { get; set; } = string.Empty;
        public bool IsValid { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
