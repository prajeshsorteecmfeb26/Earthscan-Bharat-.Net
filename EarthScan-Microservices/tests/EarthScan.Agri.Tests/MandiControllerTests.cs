using System;
using System.Collections;
using System.Linq;
using System.Threading.Tasks;
using EarthScan.Backend.Controllers;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace EarthScan.AgriService.Tests
{
    /// <summary>Unit tests for the mandi price endpoints (cached-fallback path).</summary>
    public class MandiControllerTests
    {
        private static MandiPrice BuildPrice(string commodity, string market, decimal modal)
        {
            return new MandiPrice
            {
                Commodity = commodity,
                Market = market,
                Variety = "Regular",
                MinPrice = modal - 200,
                MaxPrice = modal + 200,
                ModalPrice = modal,
                Trend = "+1.0%",
                IsUp = true,
                LastUpdated = new DateTime(2026, 5, 1)
            };
        }

        [Fact]
        public async Task GetPrices_FallsBackToCachedPrices_WhenDataGovKeyNotConfigured()
        {
            using var context = TestSupport.CreateContext();
            context.MandiPrices.AddRange(
                BuildPrice("Cotton", "Nagpur", 6900),
                BuildPrice("Wheat", "Pune", 2800));
            await context.SaveChangesAsync();

            var configuration = TestSupport.CreateConfigurationMock(dataGovKey: null);
            var controller = new MandiController(context, configuration.Object);

            var result = await controller.GetPrices(null);

            var ok = Assert.IsType<OkObjectResult>(result);
            var items = Assert.IsAssignableFrom<IEnumerable>(ok.Value).Cast<object>().ToList();
            Assert.Equal(2, items.Count);

            // The live feed must have been skipped because no API key was supplied.
            configuration.Verify(c => c["ApiKeys:DataGov"], Times.AtLeastOnce);
        }

        [Fact]
        public async Task GetPrices_FiltersByCommodity()
        {
            using var context = TestSupport.CreateContext();
            context.MandiPrices.AddRange(
                BuildPrice("Cotton", "Nagpur", 6900),
                BuildPrice("Wheat", "Pune", 2800),
                BuildPrice("Sugarcane", "Kolhapur", 3150));
            await context.SaveChangesAsync();

            var controller = new MandiController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.GetPrices("wheat");

            var ok = Assert.IsType<OkObjectResult>(result);
            var items = Assert.IsAssignableFrom<IEnumerable>(ok.Value).Cast<object>().ToList();

            Assert.Single(items);
            Assert.Equal("Wheat", TestSupport.ReadProperty(items[0], "commodity")?.ToString());
        }

        [Fact]
        public async Task GetPrices_ReturnsEmptyList_WhenNothingCached()
        {
            using var context = TestSupport.CreateContext();
            var controller = new MandiController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.GetPrices(null);

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Empty(Assert.IsAssignableFrom<IEnumerable>(ok.Value).Cast<object>());
        }

        [Fact]
        public async Task GetPriceHistory_ReturnsStoredSeries_InChronologicalOrder()
        {
            using var context = TestSupport.CreateContext();
            context.MandiHistories.AddRange(
                new MandiHistory { MandiPriceId = 7, Date = new DateTime(2026, 5, 3), Price = 6950 },
                new MandiHistory { MandiPriceId = 7, Date = new DateTime(2026, 5, 1), Price = 6900 },
                new MandiHistory { MandiPriceId = 9, Date = new DateTime(2026, 5, 2), Price = 2800 });
            await context.SaveChangesAsync();

            var controller = new MandiController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.GetPriceHistory(7);

            var ok = Assert.IsType<OkObjectResult>(result);
            var items = Assert.IsAssignableFrom<IEnumerable>(ok.Value).Cast<object>().ToList();

            Assert.Equal(2, items.Count);
            Assert.Equal("2026-05-01", TestSupport.ReadProperty(items[0], "Date")?.ToString());
            Assert.Equal("2026-05-03", TestSupport.ReadProperty(items[1], "Date")?.ToString());
        }

        [Fact]
        public async Task GetPriceHistory_GeneratesDeterministicSevenDaySeries_WhenNoHistoryStored()
        {
            using var context = TestSupport.CreateContext();
            var price = BuildPrice("Cotton", "Nagpur", 6900);
            context.MandiPrices.Add(price);
            await context.SaveChangesAsync();

            var controller = new MandiController(context, TestSupport.CreateConfigurationMock().Object);

            var first = Assert.IsType<OkObjectResult>(await controller.GetPriceHistory(price.Id));
            var second = Assert.IsType<OkObjectResult>(await controller.GetPriceHistory(price.Id));

            var firstItems = Assert.IsAssignableFrom<IEnumerable>(first.Value).Cast<object>().ToList();
            var secondItems = Assert.IsAssignableFrom<IEnumerable>(second.Value).Cast<object>().ToList();

            Assert.Equal(7, firstItems.Count);

            // Seeded by the mandi price id, so the fallback chart is stable between calls.
            Assert.Equal(
                TestSupport.ReadProperty(firstItems[0], "Price")?.ToString(),
                TestSupport.ReadProperty(secondItems[0], "Price")?.ToString());
        }
    }
}
