using System;

namespace EarthScan.Backend.Models
{
    public class DiseasePrediction
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string ImagePath { get; set; } = string.Empty;
        public string DiseaseName { get; set; } = string.Empty;
        public double Confidence { get; set; }
        public string Symptoms { get; set; } = string.Empty;
        public string OrganicTreatment { get; set; } = string.Empty;
        public string ChemicalTreatment { get; set; } = string.Empty;
        public string AgricultureOffice { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
