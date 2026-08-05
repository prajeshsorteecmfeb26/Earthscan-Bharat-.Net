using System.ComponentModel.DataAnnotations;

namespace EarthScan.Backend.Models
{
    public class StateGroundwater
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string StateName { get; set; } = string.Empty;

        // Dynamic Groundwater Resource stats
        public double AnnualRechargeBCM { get; set; }
        public double ExtractableResourceBCM { get; set; }
        public double TotalExtractionBCM { get; set; }
        public double ExtractionStagePercentage { get; set; }

        // Assessment Unit Categorisation stats
        public int TotalAssessedBlocks { get; set; }
        
        public int SafeBlocksCount { get; set; }
        public double SafeBlocksPercentage { get; set; }

        public int SemiCriticalBlocksCount { get; set; }
        public double SemiCriticalBlocksPercentage { get; set; }

        public int CriticalBlocksCount { get; set; }
        public double CriticalBlocksPercentage { get; set; }

        public int OverExploitedBlocksCount { get; set; }
        public double OverExploitedBlocksPercentage { get; set; }

        public int SalineBlocksCount { get; set; }
        public double SalineBlocksPercentage { get; set; }
    }
}
