using System;
using System.Threading.Tasks;
using EarthScan.Backend.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace EarthScan.LandService.Tests
{
    /// <summary>Unit tests for the soil health card upload and crop recommendation endpoints.</summary>
    public class SoilControllerTests
    {
        public SoilControllerTests()
        {
            // The controller falls back to this variable when configuration has no key.
            Environment.SetEnvironmentVariable("GEMINI_API_KEY", null);
        }

        [Fact]
        public async Task UploadSoilReport_ReturnsBadRequest_WhenNoFileProvided()
        {
            using var context = TestSupport.CreateContext();
            var controller = new SoilController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.UploadSoilReport(null!, 1);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("No soil report PDF file uploaded.", TestSupport.ReadMessage(badRequest.Value));
        }

        [Fact]
        public async Task UploadSoilReport_RejectsNonPdfUploads()
        {
            using var context = TestSupport.CreateContext();
            var controller = new SoilController(context, TestSupport.CreateConfigurationMock().Object);

            var file = new Mock<IFormFile>();
            file.Setup(f => f.FileName).Returns("soil-card.png");
            file.Setup(f => f.Length).Returns(4096);

            var result = await controller.UploadSoilReport(file.Object, 1);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Invalid file type. Only PDF reports are allowed.", TestSupport.ReadMessage(badRequest.Value));
        }

        [Fact]
        public async Task UploadSoilReport_RejectsReportsLargerThanFiveMegabytes()
        {
            using var context = TestSupport.CreateContext();
            var controller = new SoilController(context, TestSupport.CreateConfigurationMock().Object);

            var file = new Mock<IFormFile>();
            file.Setup(f => f.FileName).Returns("soil-card.pdf");
            file.Setup(f => f.Length).Returns(6 * 1024 * 1024);

            var result = await controller.UploadSoilReport(file.Object, 1);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("5 MB", TestSupport.ReadMessage(badRequest.Value) ?? string.Empty);
        }

        [Fact]
        public async Task RecommendCrops_ReturnsBadRequest_WhenBodyMissing()
        {
            using var context = TestSupport.CreateContext();
            var controller = new SoilController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.RecommendCrops(null!, null);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task RecommendCrops_Returns500_WhenGeminiKeyNotConfigured()
        {
            using var context = TestSupport.CreateContext();
            var configuration = TestSupport.CreateConfigurationMock(geminiKey: null);
            var controller = new SoilController(context, configuration.Object);

            var result = await controller.RecommendCrops(new SoilController.RecommendationRequest
            {
                Nitrogen = 140,
                Phosphorus = 55,
                Potassium = 85,
                Ph = 6.5,
                Rainfall = 850
            }, null);

            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(500, objectResult.StatusCode);
        }
    }
}
