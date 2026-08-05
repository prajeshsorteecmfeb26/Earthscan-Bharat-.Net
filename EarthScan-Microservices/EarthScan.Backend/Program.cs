using EarthScan.Backend.Data;
using EarthScan.Backend.Services; // Ensure this is added for the new service
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure Entity Framework Core with MySQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<EarthScanDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

builder.Services.AddHostedService<EarthScan.Backend.Services.MandiUpdateWorker>();
builder.Services.AddHttpClient<GovernmentSatbaraService>();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy => policy.SetIsOriginAllowed(origin => true)
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtSettings["Key"]!);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(key)
        };
    });

var app = builder.Build();

// Seed database with default admin/user accounts if empty
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<EarthScanDbContext>();
        context.Database.Migrate();
        
        if (!context.Users.Any())
        {
            context.Users.AddRange(
                new EarthScan.Backend.Models.User
                {
                    Name = "Admin User",
                    Email = "admin@earthscan.com",
                    Role = "Admin",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123")
                },
                new EarthScan.Backend.Models.User
                {
                    Name = "Agriculture Expert",
                    Email = "expert@earthscan.com",
                    Role = "Agriculture Expert",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Expert@123")
                },
                new EarthScan.Backend.Models.User
                {
                    Name = "Farmer User",
                    Email = "farmer@earthscan.com",
                    Role = "Farmer",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Farmer@123")
                }
            );
            context.SaveChanges();
            Console.WriteLine("Database seeded successfully with default users.");
        }

        // Reset MandiPrices to seed our comprehensive crops list
        var existingMandi = context.MandiPrices.ToList();
        if (existingMandi.Any())
        {
            context.MandiPrices.RemoveRange(existingMandi);
            context.SaveChanges();
        }

        if (!context.MandiPrices.Any())
        {
            var now = DateTime.UtcNow;
            context.MandiPrices.AddRange(
                new EarthScan.Backend.Models.MandiPrice
                {
                    Commodity = "Cotton",
                    Market = "Nagpur",
                    Variety = "H-4 Cotton",
                    MinPrice = 6200,
                    MaxPrice = 7500,
                    ModalPrice = 6900,
                    LastUpdated = now,
                    Trend = "+2.4%",
                    IsUp = true
                },
                new EarthScan.Backend.Models.MandiPrice
                {
                    Commodity = "Wheat",
                    Market = "Pune",
                    Variety = "Lokwan",
                    MinPrice = 2400,
                    MaxPrice = 3100,
                    ModalPrice = 2800,
                    LastUpdated = now,
                    Trend = "+1.8%",
                    IsUp = true
                },
                new EarthScan.Backend.Models.MandiPrice
                {
                    Commodity = "Sugarcane",
                    Market = "Kolhapur",
                    Variety = "Co-86032",
                    MinPrice = 2800,
                    MaxPrice = 3500,
                    ModalPrice = 3150,
                    LastUpdated = now,
                    Trend = "+0.5%",
                    IsUp = true
                },
                new EarthScan.Backend.Models.MandiPrice
                {
                    Commodity = "Paddy (Rice)",
                    Market = "Gondia",
                    Variety = "Basmati",
                    MinPrice = 3500,
                    MaxPrice = 4800,
                    ModalPrice = 4200,
                    LastUpdated = now,
                    Trend = "-1.2%",
                    IsUp = false
                },
                new EarthScan.Backend.Models.MandiPrice
                {
                    Commodity = "Soybean",
                    Market = "Latur",
                    Variety = "Yellow",
                    MinPrice = 4100,
                    MaxPrice = 5200,
                    ModalPrice = 4750,
                    LastUpdated = now,
                    Trend = "+3.1%",
                    IsUp = true
                },
                new EarthScan.Backend.Models.MandiPrice
                {
                    Commodity = "Onion",
                    Market = "Nashik (Lasalgaon)",
                    Variety = "Red Onion",
                    MinPrice = 1200,
                    MaxPrice = 2200,
                    ModalPrice = 1800,
                    LastUpdated = now,
                    Trend = "-4.5%",
                    IsUp = false
                },
                new EarthScan.Backend.Models.MandiPrice
                {
                    Commodity = "Potato",
                    Market = "Mumbai",
                    Variety = "Jyoti",
                    MinPrice = 1500,
                    MaxPrice = 2400,
                    ModalPrice = 2000,
                    LastUpdated = now,
                    Trend = "+1.2%",
                    IsUp = true
                },
                new EarthScan.Backend.Models.MandiPrice
                {
                    Commodity = "Tomato",
                    Market = "Pimpri APMC",
                    Variety = "Hybrid Tomato",
                    MinPrice = 2000,
                    MaxPrice = 3800,
                    ModalPrice = 3000,
                    LastUpdated = now,
                    Trend = "+5.4%",
                    IsUp = true
                },
                new EarthScan.Backend.Models.MandiPrice
                {
                    Commodity = "Maize",
                    Market = "Amravati",
                    Variety = "Yellow Maize",
                    MinPrice = 1800,
                    MaxPrice = 2400,
                    ModalPrice = 2100,
                    LastUpdated = now,
                    Trend = "+0.8%",
                    IsUp = true
                },
                new EarthScan.Backend.Models.MandiPrice
                {
                    Commodity = "Chickpeas (Chana)",
                    Market = "Akola",
                    Variety = "Desi Chana",
                    MinPrice = 4800,
                    MaxPrice = 5800,
                    ModalPrice = 5300,
                    LastUpdated = now,
                    Trend = "-0.6%",
                    IsUp = false
                }
            );
            context.SaveChanges();
            Console.WriteLine("Database seeded successfully with default Mandi prices.");
        }

        // SatbaraRegistry seeding removed as per user instruction to clear all mock/seeded records.
    }
    catch (Exception ex)
    {
        Console.WriteLine("Database migration/seeding failed: " + ex.Message);
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();