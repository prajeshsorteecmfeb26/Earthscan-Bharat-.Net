using System.Collections;
using System.Linq;
using System.Threading.Tasks;
using EarthScan.Backend.Controllers;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace EarthScan.IdentityService.Tests
{
    /// <summary>Unit tests for the farmer profile endpoints.</summary>
    public class ProfileControllerTests
    {
        [Fact]
        public async Task GetProfile_ReturnsNotFound_WhenUserMissing()
        {
            using var context = TestSupport.CreateContext();
            var controller = new ProfileController(context);

            var result = await controller.GetProfile(999);

            var notFound = Assert.IsType<NotFoundObjectResult>(result);
            Assert.Equal("User not found.", TestSupport.ReadMessage(notFound.Value));
        }

        [Fact]
        public async Task GetProfile_ReturnsTheStoredProfile()
        {
            using var context = TestSupport.CreateContext();
            var user = new User
            {
                Name = "Farmer User",
                Email = "farmer@earthscan.com",
                Role = "Farmer",
                Village = "Kalidhon",
                District = "Satara"
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var controller = new ProfileController(context);

            var result = await controller.GetProfile(user.Id);

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Equal("Farmer User", TestSupport.ReadProperty(ok.Value, "Name")?.ToString());
            Assert.Equal("Kalidhon", TestSupport.ReadProperty(ok.Value, "Village")?.ToString());
        }

        [Fact]
        public async Task UpdateProfile_ReturnsNotFound_WhenUserMissing()
        {
            using var context = TestSupport.CreateContext();
            var controller = new ProfileController(context);

            var result = await controller.UpdateProfile(new User { Id = 12345, Name = "Ghost" });

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task UpdateProfile_UpdatesEditableFields()
        {
            using var context = TestSupport.CreateContext();
            var user = new User { Name = "Old Name", Email = "farmer@earthscan.com", Role = "Farmer" };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var controller = new ProfileController(context);

            var result = await controller.UpdateProfile(new User
            {
                Id = user.Id,
                Name = "New Name",
                Role = "Land Buyer",
                Phone = "9876543210",
                Village = "Kalidhon",
                Taluka = "Khatav",
                District = "Satara",
                StateName = "Maharashtra",
                Latitude = 17.6,
                Longitude = 74.2
            });

            Assert.IsType<OkObjectResult>(result);

            var updated = context.Users.Single();
            Assert.Equal("New Name", updated.Name);
            Assert.Equal("Land Buyer", updated.Role);
            Assert.Equal("Satara", updated.District);
            Assert.Equal(17.6, updated.Latitude);
        }

        [Fact]
        public async Task UpdateProfile_IgnoresPrivilegedRoleChanges()
        {
            using var context = TestSupport.CreateContext();
            var user = new User { Name = "Farmer", Email = "farmer@earthscan.com", Role = "Farmer" };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var controller = new ProfileController(context);

            await controller.UpdateProfile(new User { Id = user.Id, Name = "Farmer", Role = "Admin" });

            // Only "Farmer" and "Land Buyer" may be selected by the user themselves.
            Assert.Equal("Farmer", context.Users.Single().Role);
        }

        [Fact]
        public async Task UploadPhoto_ReturnsBadRequest_WhenNoFileProvided()
        {
            using var context = TestSupport.CreateContext();
            var controller = new ProfileController(context);

            var result = await controller.UploadPhoto(null!, 1);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task UploadPhoto_RejectsDisallowedFileTypes()
        {
            using var context = TestSupport.CreateContext();
            var controller = new ProfileController(context);

            // Moq stands in for the uploaded multipart file.
            var file = new Mock<IFormFile>();
            file.Setup(f => f.FileName).Returns("payload.exe");
            file.Setup(f => f.Length).Returns(2048);

            var result = await controller.UploadPhoto(file.Object, 1);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("Invalid file type", badRequest.Value?.ToString() ?? string.Empty);
            file.Verify(f => f.FileName, Times.AtLeastOnce);
        }

        [Fact]
        public async Task UploadPhoto_RejectsFilesLargerThanFiveMegabytes()
        {
            using var context = TestSupport.CreateContext();
            var controller = new ProfileController(context);

            var file = new Mock<IFormFile>();
            file.Setup(f => f.FileName).Returns("huge.png");
            file.Setup(f => f.Length).Returns(6 * 1024 * 1024);

            var result = await controller.UploadPhoto(file.Object, 1);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Contains("5 MB", badRequest.Value?.ToString() ?? string.Empty);
        }

        [Fact]
        public async Task UploadPhoto_ReturnsNotFound_WhenUserMissing()
        {
            using var context = TestSupport.CreateContext();
            var controller = new ProfileController(context);

            var file = new Mock<IFormFile>();
            file.Setup(f => f.FileName).Returns("avatar.png");
            file.Setup(f => f.Length).Returns(1024);

            var result = await controller.UploadPhoto(file.Object, 4242);

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task GetHistory_ReturnsMergedActivityOrderedByDateDescending()
        {
            using var context = TestSupport.CreateContext();

            context.UserSearchHistories.Add(new UserSearchHistory
            {
                UserId = 1,
                SearchType = "Borewell Planner",
                Query = "Kalidhon, Maharashtra",
                ResultSummary = "Depth: 320 feet",
                CreatedAt = new System.DateTime(2026, 1, 1)
            });
            context.SoilReports.Add(new SoilReport
            {
                UserId = 1,
                FileName = "soil-card.pdf",
                SoilType = "Black Soil",
                Ph = 6.8,
                Nitrogen = 140,
                Phosphorus = 55,
                Potassium = 85,
                IsValid = true,
                CreatedAt = new System.DateTime(2026, 3, 1)
            });
            await context.SaveChangesAsync();

            var controller = new ProfileController(context);

            var result = await controller.GetHistory(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var items = Assert.IsAssignableFrom<IEnumerable>(ok.Value).Cast<object>().ToList();

            Assert.Equal(2, items.Count);
            Assert.Equal("Soil", TestSupport.ReadProperty(items[0], "Type")?.ToString());
            Assert.Equal("Search", TestSupport.ReadProperty(items[1], "Type")?.ToString());
        }

        [Fact]
        public async Task GetHistory_ReturnsEmptyList_ForUnknownUser()
        {
            using var context = TestSupport.CreateContext();
            var controller = new ProfileController(context);

            var result = await controller.GetHistory(999);

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Empty(Assert.IsAssignableFrom<IEnumerable>(ok.Value).Cast<object>());
        }
    }
}
