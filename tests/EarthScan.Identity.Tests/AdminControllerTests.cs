using System.Collections;
using System.Linq;
using System.Threading.Tasks;
using EarthScan.Backend.Controllers;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace EarthScan.IdentityService.Tests
{
    /// <summary>Unit tests for the admin-only user management endpoints.</summary>
    public class AdminControllerTests
    {
        [Fact]
        public async Task GetUsers_ReturnsEveryUser()
        {
            using var context = TestSupport.CreateContext();
            context.Users.AddRange(
                new User { Name = "Admin", Email = "admin@earthscan.com", Role = "Admin" },
                new User { Name = "Farmer", Email = "farmer@earthscan.com", Role = "Farmer" });
            await context.SaveChangesAsync();

            var controller = new AdminController(context);

            var result = await controller.GetUsers();

            var ok = Assert.IsType<OkObjectResult>(result);
            var items = Assert.IsAssignableFrom<IEnumerable>(ok.Value);
            Assert.Equal(2, items.Cast<object>().Count());
        }

        [Fact]
        public async Task DeleteUser_ReturnsNotFound_WhenUserMissing()
        {
            using var context = TestSupport.CreateContext();
            var controller = new AdminController(context);

            var result = await controller.DeleteUser(4242);

            var notFound = Assert.IsType<NotFoundObjectResult>(result);
            Assert.Equal("User not found", TestSupport.ReadMessage(notFound.Value));
        }

        [Fact]
        public async Task DeleteUser_RemovesTheUser()
        {
            using var context = TestSupport.CreateContext();
            var user = new User { Name = "Farmer", Email = "farmer@earthscan.com", Role = "Farmer" };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var controller = new AdminController(context);

            var result = await controller.DeleteUser(user.Id);

            Assert.IsType<OkObjectResult>(result);
            Assert.Empty(context.Users);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public async Task UpdateUserRole_ReturnsBadRequest_ForEmptyRole(string role)
        {
            using var context = TestSupport.CreateContext();
            var controller = new AdminController(context);

            var result = await controller.UpdateUserRole(1, new UserRoleUpdateRequest { Role = role });

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Role cannot be empty", TestSupport.ReadMessage(badRequest.Value));
        }

        [Fact]
        public async Task UpdateUserRole_ReturnsBadRequest_WhenBodyIsNull()
        {
            using var context = TestSupport.CreateContext();
            var controller = new AdminController(context);

            var result = await controller.UpdateUserRole(1, null!);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task UpdateUserRole_PersistsTheNewRole()
        {
            using var context = TestSupport.CreateContext();
            var user = new User { Name = "Farmer", Email = "farmer@earthscan.com", Role = "Farmer" };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var controller = new AdminController(context);

            var result = await controller.UpdateUserRole(user.Id, new UserRoleUpdateRequest { Role = "Agriculture Expert" });

            Assert.IsType<OkObjectResult>(result);
            Assert.Equal("Agriculture Expert", context.Users.Single().Role);
        }
    }
}
