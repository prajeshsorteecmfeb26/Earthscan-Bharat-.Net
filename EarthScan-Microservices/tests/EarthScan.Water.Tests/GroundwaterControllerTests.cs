using System.Threading.Tasks;
using EarthScan.Backend.Controllers;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace EarthScan.WaterService.Tests
{
    /// <summary>
    /// Unit tests for the groundwater and borewell planner endpoints.
    /// Only the offline code paths are exercised: no coordinates are supplied, and the mocked
    /// configuration reports no data.gov.in key, so no outbound HTTP call is ever made.
    /// </summary>
    public class GroundwaterControllerTests
    {
        private static StateGroundwater BuildMaharashtra()
        {
            return new StateGroundwater
            {
                StateName = "Maharashtra",
                AnnualRechargeBCM = 34.5,
                ExtractableResourceBCM = 31.9,
                TotalExtractionBCM = 16.8,
                ExtractionStagePercentage = 52.7,
                TotalAssessedBlocks = 1533,
                SafeBlocksCount = 1315,
                SafeBlocksPercentage = 85.8,
                SalineBlocksCount = 0
            };
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public async Task GetStateStats_ReturnsBadRequest_WhenStateMissing(string state)
        {
            using var context = TestSupport.CreateContext();
            var controller = new GroundwaterController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.GetStateStats(state);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task GetStateStats_ReturnsStoredStatistics()
        {
            using var context = TestSupport.CreateContext();
            context.StateGroundwaters.Add(BuildMaharashtra());
            await context.SaveChangesAsync();

            var controller = new GroundwaterController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.GetStateStats("Maharashtra");

            var ok = Assert.IsType<OkObjectResult>(result);
            var stats = Assert.IsType<StateGroundwater>(ok.Value);
            Assert.Equal(85.8, stats.SafeBlocksPercentage);
        }

        [Fact]
        public async Task GetStateStats_MatchesCaseInsensitively()
        {
            using var context = TestSupport.CreateContext();
            context.StateGroundwaters.Add(BuildMaharashtra());
            await context.SaveChangesAsync();

            var controller = new GroundwaterController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.GetStateStats("  maharashtra ");

            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task GetStateStats_ReturnsNotFound_ForUnknownState()
        {
            using var context = TestSupport.CreateContext();
            var controller = new GroundwaterController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.GetStateStats("Atlantis");

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Theory]
        [InlineData("", "Satara")]
        [InlineData("Maharashtra", "")]
        [InlineData("   ", "   ")]
        public async Task GetBorewellProfile_ReturnsBadRequest_WhenStateOrDistrictMissing(string state, string district)
        {
            using var context = TestSupport.CreateContext();
            var controller = new GroundwaterController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.GetBorewellProfile(state, district, null, null, null, null);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task GetBorewellProfile_ReturnsNotFound_ForUnknownLocation()
        {
            using var context = TestSupport.CreateContext();

            // No data.gov.in key and no coordinates => offline path only.
            var configuration = TestSupport.CreateConfigurationMock(dataGovKey: null);
            var controller = new GroundwaterController(context, configuration.Object);

            var result = await controller.GetBorewellProfile("Atlantis", "Nowhere", null, null, null, null);

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task GetBorewellProfile_DoesNotRecordSearchHistory_WhenLookupFails()
        {
            using var context = TestSupport.CreateContext();
            var controller = new GroundwaterController(context, TestSupport.CreateConfigurationMock().Object);

            await controller.GetBorewellProfile("Atlantis", "Nowhere", null, null, null, 1);

            Assert.Empty(context.UserSearchHistories);
        }
    }
}
