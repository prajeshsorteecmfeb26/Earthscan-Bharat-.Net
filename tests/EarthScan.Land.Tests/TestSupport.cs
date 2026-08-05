using System;
using System.Reflection;
using EarthScan.Backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;

namespace EarthScan.LandService.Tests
{
    /// <summary>
    /// Shared helpers for the Land service test suite.
    /// Every test gets a throw-away EF Core in-memory database, and configuration is supplied
    /// through Moq mocks so no real API keys or network access are ever needed.
    /// </summary>
    internal static class TestSupport
    {
        /// <summary>A fresh, isolated in-memory EarthScanDbContext.</summary>
        public static EarthScanDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<EarthScanDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .EnableSensitiveDataLogging()
                .Options;

            return new EarthScanDbContext(options);
        }

        /// <summary>
        /// Mocked IConfiguration exposing a valid "Jwt" section and, by default, no API keys.
        /// </summary>
        public static Mock<IConfiguration> CreateConfigurationMock(
            string? geminiKey = null,
            string? dataGovKey = null)
        {
            var jwtSection = new Mock<IConfigurationSection>();
            jwtSection.Setup(section => section["Key"]).Returns("SuperSecretKeyForEarthScanBharatPlatform2026!");
            jwtSection.Setup(section => section["Issuer"]).Returns("EarthScanBackend");
            jwtSection.Setup(section => section["Audience"]).Returns("EarthScanUsers");

            var configuration = new Mock<IConfiguration>();
            configuration.Setup(c => c.GetSection("Jwt")).Returns(jwtSection.Object);
            configuration.Setup(c => c["ApiKeys:Gemini"]).Returns(geminiKey);
            configuration.Setup(c => c["ApiKeys:DataGov"]).Returns(dataGovKey);
            configuration.Setup(c => c["Gemini:Model"]).Returns("gemini-3.6-flash");

            return configuration;
        }

        /// <summary>Reads a property off an anonymous response object returned by a controller.</summary>
        public static object? ReadProperty(object? source, string propertyName)
        {
            if (source == null)
            {
                return null;
            }

            PropertyInfo? property = source.GetType().GetProperty(propertyName);
            return property?.GetValue(source);
        }

        /// <summary>Reads the conventional "message" property off a controller response.</summary>
        public static string? ReadMessage(object? source)
        {
            return ReadProperty(source, "message")?.ToString();
        }
    }
}
