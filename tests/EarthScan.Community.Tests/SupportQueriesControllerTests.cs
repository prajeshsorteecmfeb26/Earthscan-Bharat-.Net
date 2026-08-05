using System;
using System.Linq;
using System.Threading.Tasks;
using EarthScan.Backend.Controllers;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace EarthScan.CommunityService.Tests
{
    /// <summary>Unit tests for the farmer support desk endpoints.</summary>
    public class SupportQueriesControllerTests
    {
        private static SupportQuery BuildQuery(string email, DateTime createdAt, string status = "Pending")
        {
            return new SupportQuery
            {
                Farmer = "Farmer User",
                Email = email,
                Title = "Support Request",
                Description = "Need help with soil report",
                Location = "Online Support",
                Status = status,
                CreatedAt = createdAt
            };
        }

        [Fact]
        public async Task GetQueries_ReturnsNewestFirst()
        {
            using var context = TestSupport.CreateContext();
            context.SupportQueries.AddRange(
                BuildQuery("a@earthscan.com", new DateTime(2026, 1, 1)),
                BuildQuery("b@earthscan.com", new DateTime(2026, 6, 1)));
            await context.SaveChangesAsync();

            var controller = new SupportQueriesController(context);

            var result = await controller.GetQueries();

            Assert.NotNull(result.Value);
            var queries = result.Value!.ToList();
            Assert.Equal(2, queries.Count);
            Assert.Equal("b@earthscan.com", queries[0].Email);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public async Task GetQueriesByEmail_ReturnsBadRequest_WhenEmailMissing(string email)
        {
            using var context = TestSupport.CreateContext();
            var controller = new SupportQueriesController(context);

            var result = await controller.GetQueriesByEmail(email);

            Assert.IsType<BadRequestObjectResult>(result.Result);
        }

        [Fact]
        public async Task GetQueriesByEmail_MatchesCaseInsensitively()
        {
            using var context = TestSupport.CreateContext();
            context.SupportQueries.AddRange(
                BuildQuery("Farmer@EarthScan.com", new DateTime(2026, 2, 1)),
                BuildQuery("other@earthscan.com", new DateTime(2026, 3, 1)));
            await context.SaveChangesAsync();

            var controller = new SupportQueriesController(context);

            var result = await controller.GetQueriesByEmail("farmer@earthscan.com");

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var queries = Assert.IsAssignableFrom<System.Collections.Generic.List<SupportQuery>>(ok.Value);
            Assert.Single(queries);
        }

        [Theory]
        [InlineData("", "farmer@earthscan.com", "Message")]
        [InlineData("Farmer", "", "Message")]
        [InlineData("Farmer", "farmer@earthscan.com", "")]
        public async Task SubmitQuery_ReturnsBadRequest_WhenAnyFieldMissing(string name, string email, string message)
        {
            using var context = TestSupport.CreateContext();
            var controller = new SupportQueriesController(context);

            var result = await controller.SubmitQuery(new ContactSupportRequest
            {
                Name = name,
                Email = email,
                Message = message
            });

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("All fields are required.", TestSupport.ReadMessage(badRequest.Value));
            Assert.Empty(context.SupportQueries);
        }

        [Fact]
        public async Task SubmitQuery_TruncatesTheTitleForLongMessages()
        {
            using var context = TestSupport.CreateContext();
            var controller = new SupportQueriesController(context);

            var longMessage = new string('x', 200);

            var result = await controller.SubmitQuery(new ContactSupportRequest
            {
                Name = "Farmer User",
                Email = "farmer@earthscan.com",
                Message = longMessage
            });

            Assert.IsType<OkObjectResult>(result);

            var saved = context.SupportQueries.Single();
            Assert.Equal(40, saved.Title.Length);
            Assert.EndsWith("...", saved.Title);
            Assert.Equal("Pending", saved.Status);
            Assert.Equal(longMessage, saved.Description);
        }

        [Fact]
        public async Task SubmitQuery_KeepsShortMessagesAsTheTitle()
        {
            using var context = TestSupport.CreateContext();
            var controller = new SupportQueriesController(context);

            await controller.SubmitQuery(new ContactSupportRequest
            {
                Name = "Farmer User",
                Email = "farmer@earthscan.com",
                Message = "Soil card not parsing"
            });

            Assert.Equal("Soil card not parsing", context.SupportQueries.Single().Title);
        }

        [Fact]
        public async Task ReplyQuery_ReturnsBadRequest_WhenReplyEmpty()
        {
            using var context = TestSupport.CreateContext();
            var controller = new SupportQueriesController(context);

            var result = await controller.ReplyQuery(1, new SupportQueryReplyRequest { Reply = "   " });

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task ReplyQuery_ReturnsNotFound_WhenQueryMissing()
        {
            using var context = TestSupport.CreateContext();
            var controller = new SupportQueriesController(context);

            var result = await controller.ReplyQuery(4242, new SupportQueryReplyRequest { Reply = "Answered" });

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task ReplyQuery_StoresAnswerAndMarksQueryAnswered()
        {
            using var context = TestSupport.CreateContext();
            var query = BuildQuery("farmer@earthscan.com", new DateTime(2026, 4, 1));
            context.SupportQueries.Add(query);
            await context.SaveChangesAsync();

            var controller = new SupportQueriesController(context);

            var result = await controller.ReplyQuery(query.Id, new SupportQueryReplyRequest
            {
                Reply = "Please re-upload the PDF version of the soil card."
            });

            Assert.IsType<OkObjectResult>(result);

            var updated = context.SupportQueries.Single();
            Assert.Equal("Answered", updated.Status);
            Assert.Equal("Please re-upload the PDF version of the soil card.", updated.Answer);
        }
    }
}
