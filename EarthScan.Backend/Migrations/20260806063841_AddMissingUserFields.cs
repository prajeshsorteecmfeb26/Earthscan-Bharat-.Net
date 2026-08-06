using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EarthScan.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddMissingUserFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProfilePicturePath",
                table: "Users",
                type: "longtext",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Users",
                type: "longtext",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "Users",
                type: "longtext",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FarmingInformation",
                table: "Users",
                type: "longtext",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FavoriteCropsJson",
                table: "Users",
                type: "longtext",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FavoriteLandsJson",
                table: "Users",
                type: "longtext",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProfilePicturePath",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "FarmingInformation",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "FavoriteCropsJson",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "FavoriteLandsJson",
                table: "Users");
        }
    }
}
