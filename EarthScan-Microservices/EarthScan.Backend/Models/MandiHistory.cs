using System;

namespace EarthScan.Backend.Models
{
    public class MandiHistory
    {
        public int Id { get; set; }
        public int MandiPriceId { get; set; }
        public DateTime Date { get; set; }
        public decimal Price { get; set; }
    }
}
