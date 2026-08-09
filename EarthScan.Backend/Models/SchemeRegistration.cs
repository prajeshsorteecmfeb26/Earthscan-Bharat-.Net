using System;
using System.ComponentModel.DataAnnotations;

namespace EarthScan.Backend.Models
{
    public class SchemeRegistration
    {
        [Key]
        public int Id { get; set; }

        public int SchemeId { get; set; }
        public string SchemeName { get; set; } = string.Empty;

        public int FarmerId { get; set; }
        public string FarmerName { get; set; } = string.Empty;
        public string FarmerEmail { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        
        public string AadhaarNumber { get; set; } = string.Empty;
        public double LandSizeAcres { get; set; }
        public string BankAccountNumber { get; set; } = string.Empty;
        public string IfscCode { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;

        public string Status { get; set; } = "Submitted - Under Review";
        public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
    }

    public class RegisterSchemeRequest
    {
        public int SchemeId { get; set; }
        public string SchemeName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string AadhaarNumber { get; set; } = string.Empty;
        public double LandSizeAcres { get; set; }
        public string BankAccountNumber { get; set; } = string.Empty;
        public string IfscCode { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
    }
}
