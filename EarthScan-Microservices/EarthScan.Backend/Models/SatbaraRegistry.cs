using System;
using System.ComponentModel.DataAnnotations;

namespace EarthScan.Backend.Models
{
    public class SatbaraRegistry
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string SurveyNo { get; set; } = string.Empty;

        [Required]
        public string Village { get; set; } = string.Empty;

        [Required]
        public string District { get; set; } = string.Empty;

        public string Taluka { get; set; } = "Khatav";

        [Required]
        public string State { get; set; } = "Maharashtra";

        public string OwnerName { get; set; } = string.Empty;
        public string OwnerPhone { get; set; } = string.Empty;
        public string Tenure { get; set; } = "Occupant Class II (भोगवटादार वर्ग - २)";
        public string TotalArea { get; set; } = "1.18 Hectares (2.91 Acres)";
        public string CultivableArea { get; set; } = "1.01 Hectares";
        public string Potkharaba { get; set; } = "0.17 Hectares";
        public string AssessmentTax { get; set; } = "₹ 1.25";
        public string IrrigationSource { get; set; } = "Well Water (विहीर पाणी)";
        public string HasWell { get; set; } = "Yes (१ विहीर)";
        public string OtherRights { get; set; } = "None";
        public string CropHistoryJson { get; set; } = "[]";
    }
}
