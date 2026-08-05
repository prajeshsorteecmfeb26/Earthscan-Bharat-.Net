using System;

namespace EarthScan.Backend.Models
{
    public class GovernmentScheme
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Benefit { get; set; } = string.Empty;
        public string Eligibility { get; set; } = string.Empty;
        public string ApplicationLink { get; set; } = string.Empty;
        public string Status { get; set; } = "Active";
    }
}
