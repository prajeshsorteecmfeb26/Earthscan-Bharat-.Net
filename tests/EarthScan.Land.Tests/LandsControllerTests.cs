using System.Collections;
using System.Linq;
using System.Threading.Tasks;
using EarthScan.Backend.Controllers;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace EarthScan.LandService.Tests
{
    /// <summary>Unit tests for the land marketplace and 7/12 (Satbara) endpoints.</summary>
    public class LandsControllerTests
    {
        private static Land BuildLand(string title = "Fertile plot")
        {
            return new Land
            {
                Title = title,
                Description = "Well irrigated black cotton soil",
                Location = "Kalidhon, Satara",
                Price = 1500000m,
                SizeInAcres = 2.5,
                SoilType = "Black Soil",
                GroundwaterLevelDepth = 25,
                ContactNumber = "9999999999",
                OwnerId = 1
            };
        }

        [Fact]
        public async Task GetLands_ReturnsEveryListing()
        {
            using var context = TestSupport.CreateContext();
            context.Lands.AddRange(BuildLand("Plot A"), BuildLand("Plot B"));
            await context.SaveChangesAsync();

            var controller = new LandsController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.GetLands();

            Assert.NotNull(result.Value);
            Assert.Equal(2, result.Value!.Count());
        }

        [Fact]
        public async Task GetLand_ReturnsNotFound_WhenMissing()
        {
            using var context = TestSupport.CreateContext();
            var controller = new LandsController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.GetLand(4242);

            var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
            Assert.Equal("Land record not found.", TestSupport.ReadMessage(notFound.Value));
        }

        [Fact]
        public async Task GetLand_ReturnsTheListing()
        {
            using var context = TestSupport.CreateContext();
            var land = BuildLand();
            context.Lands.Add(land);
            await context.SaveChangesAsync();

            var controller = new LandsController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.GetLand(land.Id);

            Assert.NotNull(result.Value);
            Assert.Equal("Fertile plot", result.Value!.Title);
        }

        [Fact]
        public async Task DeleteLand_ReturnsNotFound_WhenMissing()
        {
            using var context = TestSupport.CreateContext();
            var controller = new LandsController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.DeleteLand(4242);

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task DeleteLand_RemovesTheListing()
        {
            using var context = TestSupport.CreateContext();
            var land = BuildLand();
            context.Lands.Add(land);
            await context.SaveChangesAsync();

            var controller = new LandsController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.DeleteLand(land.Id);

            Assert.IsType<OkObjectResult>(result);
            Assert.Empty(context.Lands);
        }

        [Theory]
        [InlineData("")]
        [InlineData(null)]
        public async Task GetSatbaraDetails_ReturnsBadRequest_WhenSurveyNumberMissing(string? surveyNo)
        {
            using var context = TestSupport.CreateContext();
            var controller = new LandsController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.GetSatbaraDetails(surveyNo!, null, null);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Survey number is required.", TestSupport.ReadMessage(badRequest.Value));
        }

        [Fact]
        public async Task GetSatbaraDetails_ReportsUnverified_WhenLiveLookupUnavailable()
        {
            using var context = TestSupport.CreateContext();
            var controller = new LandsController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.GetSatbaraDetails("123/4", null, null);

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(false, TestSupport.ReadProperty(ok.Value, "verified"));
        }

        [Fact]
        public async Task UploadSatbara_ReturnsBadRequest_WhenNoFileProvided()
        {
            using var context = TestSupport.CreateContext();
            var controller = new LandsController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.UploadSatbara(null!);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task UploadSatbara_RejectsUnsupportedFileTypes()
        {
            using var context = TestSupport.CreateContext();
            var controller = new LandsController(context, TestSupport.CreateConfigurationMock().Object);

            var file = new Mock<IFormFile>();
            file.Setup(f => f.FileName).Returns("record.txt");
            file.Setup(f => f.Length).Returns(1024);

            var result = await controller.UploadSatbara(file.Object);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("Invalid file type", TestSupport.ReadMessage(badRequest.Value) ?? string.Empty);
        }

        [Fact]
        public async Task GetInvestmentAnalysis_ReturnsBadRequest_WhenCropMissing()
        {
            using var context = TestSupport.CreateContext();
            var controller = new LandsController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.GetInvestmentAnalysis(1, "  ", null, null);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Crop name is required for investment analysis.", TestSupport.ReadMessage(badRequest.Value));
        }

        [Fact]
        public async Task GetInvestmentAnalysis_ReturnsNotFound_WhenLandMissing()
        {
            using var context = TestSupport.CreateContext();
            var controller = new LandsController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.GetInvestmentAnalysis(4242, "Cotton", null, null);

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task GetInvestmentAnalysis_Returns500_WhenGeminiKeyNotConfigured()
        {
            using var context = TestSupport.CreateContext();
            var land = BuildLand();
            context.Lands.Add(land);
            await context.SaveChangesAsync();

            // Mocked configuration deliberately reports no Gemini key.
            var configuration = TestSupport.CreateConfigurationMock(geminiKey: null);
            var controller = new LandsController(context, configuration.Object);

            var result = await controller.GetInvestmentAnalysis(land.Id, "Cotton", null, null);

            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(500, objectResult.StatusCode);
            configuration.Verify(c => c["ApiKeys:Gemini"], Times.AtLeastOnce);
        }
    }
}
