using System;

namespace EarthScan.Backend.Models
{
    public class MandiPrice
    {
        public int Id { get; set; }
        public string Commodity { get; set; } = string.Empty;
        public string Variety { get; set; } = string.Empty;
        public string Market { get; set; } = string.Empty;
        public decimal MinPrice { get; set; }
        public decimal MaxPrice { get; set; }
        public decimal ModalPrice { get; set; }
        public double ArrivalQuantity { get; set; }
        public string Trend { get; set; } = string.Empty;
        public bool IsUp { get; set; }
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }
}
