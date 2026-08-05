using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EarthScan.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddStateGroundwater : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StateGroundwaters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    StateName = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    AnnualRechargeBCM = table.Column<double>(type: "double", nullable: false),
                    ExtractableResourceBCM = table.Column<double>(type: "double", nullable: false),
                    TotalExtractionBCM = table.Column<double>(type: "double", nullable: false),
                    ExtractionStagePercentage = table.Column<double>(type: "double", nullable: false),
                    TotalAssessedBlocks = table.Column<int>(type: "int", nullable: false),
                    SafeBlocksCount = table.Column<int>(type: "int", nullable: false),
                    SafeBlocksPercentage = table.Column<double>(type: "double", nullable: false),
                    SemiCriticalBlocksCount = table.Column<int>(type: "int", nullable: false),
                    SemiCriticalBlocksPercentage = table.Column<double>(type: "double", nullable: false),
                    CriticalBlocksCount = table.Column<int>(type: "int", nullable: false),
                    CriticalBlocksPercentage = table.Column<double>(type: "double", nullable: false),
                    OverExploitedBlocksCount = table.Column<int>(type: "int", nullable: false),
                    OverExploitedBlocksPercentage = table.Column<double>(type: "double", nullable: false),
                    SalineBlocksCount = table.Column<int>(type: "int", nullable: false),
                    SalineBlocksPercentage = table.Column<double>(type: "double", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StateGroundwaters", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StateGroundwaters");
        }
    }
}
