using System.Threading.Tasks;
using EarthScan.Backend.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace EarthScan.AgriService.Tests
{
    /// <summary>Unit tests for the crop disease detection upload validation.</summary>
    public class DiseaseControllerTests
    {
        [Fact]
        public async Task DetectDisease_ReturnsBadRequest_WhenNoFileProvided()
        {
            using var context = TestSupport.CreateContext();
            var controller = new DiseaseController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.DetectDisease(null!, 1);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("No leaf/crop image file uploaded.", TestSupport.ReadMessage(badRequest.Value));
        }

        [Fact]
        public async Task DetectDisease_ReturnsBadRequest_ForEmptyFile()
        {
            using var context = TestSupport.CreateContext();
            var controller = new DiseaseController(context, TestSupport.CreateConfigurationMock().Object);

            var file = new Mock<IFormFile>();
            file.Setup(f => f.FileName).Returns("leaf.jpg");
            file.Setup(f => f.Length).Returns(0);

            var result = await controller.DetectDisease(file.Object, 1);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Theory]
        [InlineData("leaf.gif")]
        [InlineData("leaf.bmp")]
        [InlineData("leaf")]
        public async Task DetectDisease_RejectsUnsupportedImageFormats(string fileName)
        {
            using var context = TestSupport.CreateContext();
            var controller = new DiseaseController(context, TestSupport.CreateConfigurationMock().Object);

            var file = new Mock<IFormFile>();
            file.Setup(f => f.FileName).Returns(fileName);
            file.Setup(f => f.Length).Returns(4096);

            var result = await controller.DetectDisease(file.Object, 1);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("Invalid file type", TestSupport.ReadMessage(badRequest.Value) ?? string.Empty);
        }

        [Fact]
        public async Task DetectDisease_RejectsImagesLargerThanFiveMegabytes()
        {
            using var context = TestSupport.CreateContext();
            var controller = new DiseaseController(context, TestSupport.CreateConfigurationMock().Object);

            var file = new Mock<IFormFile>();
            file.Setup(f => f.FileName).Returns("leaf.jpg");
            file.Setup(f => f.Length).Returns(6 * 1024 * 1024);

            var result = await controller.DetectDisease(file.Object, 1);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("5 MB", TestSupport.ReadMessage(badRequest.Value) ?? string.Empty);
        }

        [Fact]
        public async Task DetectDisease_StoresNothing_WhenValidationFails()
        {
            using var context = TestSupport.CreateContext();
            var controller = new DiseaseController(context, TestSupport.CreateConfigurationMock().Object);

            var file = new Mock<IFormFile>();
            file.Setup(f => f.FileName).Returns("leaf.gif");
            file.Setup(f => f.Length).Returns(4096);

            await controller.DetectDisease(file.Object, 1);

            Assert.Empty(context.DiseasePredictions);
        }
    }
}
