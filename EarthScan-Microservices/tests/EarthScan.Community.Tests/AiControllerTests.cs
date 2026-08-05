using System.Threading.Tasks;
using EarthScan.Backend.Controllers;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace EarthScan.CommunityService.Tests
{
    /// <summary>Unit tests for the Krishi Mitra advisory endpoint (offline paths only).</summary>
    public class AiControllerTests
    {
        [Fact]
        public async Task Chat_ReturnsBadRequest_WhenBodyMissing()
        {
            using var context = TestSupport.CreateContext();
            var controller = new AiController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.Chat(null!);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public async Task Chat_ReturnsBadRequest_WhenQuestionEmpty(string question)
        {
            using var context = TestSupport.CreateContext();
            var controller = new AiController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.Chat(new AiController.ChatRequest
            {
                UserId = 1,
                Question = question
            });

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task Chat_Returns500_WhenGeminiKeyNotConfigured()
        {
            using var context = TestSupport.CreateContext();
            var configuration = TestSupport.CreateConfigurationMock(geminiKey: null);
            var controller = new AiController(context, configuration.Object);

            var result = await controller.Chat(new AiController.ChatRequest
            {
                UserId = 1,
                Question = "Which crop suits black soil in Latur?",
                Location = "Latur"
            });

            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(500, objectResult.StatusCode);

            configuration.Verify(c => c["ApiKeys:Gemini"], Times.AtLeastOnce);
            Assert.Empty(context.AIChatHistories);
        }
    }
}
