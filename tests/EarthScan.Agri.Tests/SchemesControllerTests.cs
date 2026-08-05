using System.Linq;
using System.Threading.Tasks;
using EarthScan.Backend.Controllers;
using EarthScan.Backend.Models;
using Xunit;

namespace EarthScan.AgriService.Tests
{
    /// <summary>Unit tests for the government scheme catalogue.</summary>
    public class SchemesControllerTests
    {
        [Fact]
        public async Task GetSchemes_ReturnsEverySeededScheme()
        {
            using var context = TestSupport.CreateContext();
            context.GovernmentSchemes.AddRange(
                new GovernmentScheme { Name = "PM Kisan Samman Nidhi", Benefit = "Rs 6,000 per year" },
                new GovernmentScheme { Name = "Soil Health Card Scheme", Benefit = "Free soil testing" });
            await context.SaveChangesAsync();

            var controller = new SchemesController(context);

            var result = await controller.GetSchemes();

            Assert.NotNull(result.Value);
            Assert.Equal(2, result.Value!.Count());
        }

        [Fact]
        public async Task GetSchemes_ReturnsEmptyList_WhenNoneConfigured()
        {
            using var context = TestSupport.CreateContext();
            var controller = new SchemesController(context);

            var result = await controller.GetSchemes();

            Assert.NotNull(result.Value);
            Assert.Empty(result.Value!);
        }
    }
}
