using System.Linq;
using System.Threading.Tasks;
using EarthScan.Backend.Controllers;
using EarthScan.Backend.DTOs;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace EarthScan.IdentityService.Tests
{
    /// <summary>Unit tests for the registration / login / password-reset endpoints.</summary>
    public class AuthControllerTests
    {
        private const string ValidPassword = "Farmer@123";

        [Fact]
        public async Task Register_PersistsUser_AndHashesPassword()
        {
            using var context = TestSupport.CreateContext();
            var configuration = TestSupport.CreateConfigurationMock();
            var controller = new AuthController(context, configuration.Object);

            var result = await controller.Register(new RegisterRequest
            {
                Name = "Ankit",
                Email = "ankit@earthscan.com",
                Password = ValidPassword,
                Role = "Farmer",
                Phone = "9999999999",
                Village = "Kalidhon",
                Pincode = "415502"
            });

            Assert.IsType<OkObjectResult>(result);

            var saved = context.Users.Single();
            Assert.Equal("ankit@earthscan.com", saved.Email);
            Assert.Equal("Kalidhon", saved.Village);
            Assert.NotEqual(ValidPassword, saved.PasswordHash);
            Assert.True(BCrypt.Net.BCrypt.Verify(ValidPassword, saved.PasswordHash));
        }

        [Fact]
        public async Task Register_ReturnsBadRequest_WhenEmailAlreadyExists()
        {
            using var context = TestSupport.CreateContext();
            context.Users.Add(new User { Name = "Existing", Email = "taken@earthscan.com", Role = "Farmer" });
            await context.SaveChangesAsync();

            var controller = new AuthController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.Register(new RegisterRequest
            {
                Name = "Duplicate",
                Email = "taken@earthscan.com",
                Password = ValidPassword,
                Role = "Farmer"
            });

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Email is already registered", TestSupport.ReadMessage(badRequest.Value));
            Assert.Equal(1, context.Users.Count());
        }

        [Fact]
        public async Task Login_ReturnsTokenAndUser_ForValidCredentials()
        {
            using var context = TestSupport.CreateContext();
            context.Users.Add(new User
            {
                Name = "Farmer User",
                Email = "farmer@earthscan.com",
                Role = "Farmer",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(ValidPassword)
            });
            await context.SaveChangesAsync();

            var configuration = TestSupport.CreateConfigurationMock();
            var controller = new AuthController(context, configuration.Object);

            var result = await controller.Login(new LoginRequest
            {
                Email = "farmer@earthscan.com",
                Password = ValidPassword
            });

            var ok = Assert.IsType<OkObjectResult>(result);
            var token = TestSupport.ReadProperty(ok.Value, "token")?.ToString();

            Assert.False(string.IsNullOrWhiteSpace(token));
            Assert.Equal(3, token!.Split('.').Length); // header.payload.signature
            Assert.NotNull(TestSupport.ReadProperty(ok.Value, "user"));

            // The controller must read its signing material from configuration (Moq verification).
            configuration.Verify(c => c.GetSection("Jwt"), Times.Once);
        }

        [Fact]
        public async Task Login_ReturnsUnauthorized_ForWrongPassword()
        {
            using var context = TestSupport.CreateContext();
            context.Users.Add(new User
            {
                Name = "Farmer User",
                Email = "farmer@earthscan.com",
                Role = "Farmer",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(ValidPassword)
            });
            await context.SaveChangesAsync();

            var controller = new AuthController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.Login(new LoginRequest
            {
                Email = "farmer@earthscan.com",
                Password = "WrongPass@1"
            });

            var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
            Assert.Equal("Invalid email or password", TestSupport.ReadMessage(unauthorized.Value));
        }

        [Fact]
        public async Task Login_ReturnsUnauthorized_WhenUserDoesNotExist()
        {
            using var context = TestSupport.CreateContext();
            var controller = new AuthController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.Login(new LoginRequest
            {
                Email = "nobody@earthscan.com",
                Password = ValidPassword
            });

            Assert.IsType<UnauthorizedObjectResult>(result);
        }

        [Fact]
        public async Task ResetPassword_ReturnsNotFound_ForUnknownEmail()
        {
            using var context = TestSupport.CreateContext();
            var controller = new AuthController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.ResetPassword(new ResetPasswordRequest
            {
                Email = "nobody@earthscan.com",
                NewPassword = "Brand@New1"
            });

            var notFound = Assert.IsType<NotFoundObjectResult>(result);
            Assert.Equal("User with this email does not exist", TestSupport.ReadMessage(notFound.Value));
        }

        [Fact]
        public async Task ResetPassword_ReplacesStoredHash()
        {
            using var context = TestSupport.CreateContext();
            var originalHash = BCrypt.Net.BCrypt.HashPassword(ValidPassword);
            context.Users.Add(new User
            {
                Name = "Farmer User",
                Email = "farmer@earthscan.com",
                Role = "Farmer",
                PasswordHash = originalHash
            });
            await context.SaveChangesAsync();

            var controller = new AuthController(context, TestSupport.CreateConfigurationMock().Object);

            var result = await controller.ResetPassword(new ResetPasswordRequest
            {
                Email = "farmer@earthscan.com",
                NewPassword = "Brand@New1"
            });

            Assert.IsType<OkObjectResult>(result);

            var updated = context.Users.Single();
            Assert.NotEqual(originalHash, updated.PasswordHash);
            Assert.True(BCrypt.Net.BCrypt.Verify("Brand@New1", updated.PasswordHash));
        }
    }
}
