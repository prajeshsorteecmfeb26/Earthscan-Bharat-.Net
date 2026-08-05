// ---------------------------------------------------------------------------
// EarthScan Agri microservice.
//
// NEW FILE - added for the microservice split. Every controller, model, DTO and
// migration it hosts is the original monolith source, linked unmodified from
// ..\..\EarthScan.Backend (see the .csproj).
// ---------------------------------------------------------------------------
using System.Text;
using EarthScan.Backend.Data;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// --- MVC + Swagger -------------------------------------------------------
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "EarthScan Agri Service", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste the JWT returned by POST /api/auth/login."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            new string[] { }
        }
    });
});

// --- Database (this service owns the 'earthscan_agri' schema) --------------------
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<EarthScanDbContext>(options =>
    options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 36))));

// --- Background worker that refreshes cached mandi prices (original file) --
builder.Services.AddHostedService<EarthScan.Backend.Services.MandiUpdateWorker>();

// --- CORS (identical policy to the original monolith) --------------------
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy => policy.SetIsOriginAllowed(origin => true)
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

// --- JWT (same key/issuer/audience across every service, so a token issued
//     by the Identity service is accepted everywhere) ---------------------
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtSettings["Key"]!);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
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

// --- Schema creation. Inside docker-compose MySQL is usually still starting
//     up when this service boots, so migrations are retried. ---------------
await MigrateWithRetryAsync(app, 15, TimeSpan.FromSeconds(5));

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowFrontend");
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "agri" }));

app.Run();

async Task MigrateWithRetryAsync(WebApplication application, int maxAttempts, TimeSpan delay)
{
    for (var attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try
        {
            using var scope = application.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EarthScanDbContext>();
            context.Database.Migrate();
            await SeedAsync(context);
            application.Logger.LogInformation("[agri] Database ready.");
            return;
        }
        catch (Exception ex)
        {
            application.Logger.LogWarning(
                "[agri] Database not ready (attempt {Attempt}/{MaxAttempts}): {Message}",
                attempt, maxAttempts, ex.Message);

            if (attempt == maxAttempts)
            {
                application.Logger.LogError(ex, "[agri] Giving up on database initialisation.");
                return;
            }

            await Task.Delay(delay);
        }
    }
}

async Task SeedAsync(EarthScanDbContext context)
{
    // Same comprehensive crop list the monolith seeded on first run.
    if (await context.MandiPrices.AnyAsync())
    {
        return;
    }

    var now = DateTime.UtcNow;

    context.MandiPrices.AddRange(
        new MandiPrice { Commodity = "Cotton", Market = "Nagpur", Variety = "H-4 Cotton", MinPrice = 6200, MaxPrice = 7500, ModalPrice = 6900, LastUpdated = now, Trend = "+2.4%", IsUp = true },
        new MandiPrice { Commodity = "Wheat", Market = "Pune", Variety = "Lokwan", MinPrice = 2400, MaxPrice = 3100, ModalPrice = 2800, LastUpdated = now, Trend = "+1.8%", IsUp = true },
        new MandiPrice { Commodity = "Sugarcane", Market = "Kolhapur", Variety = "Co-86032", MinPrice = 2800, MaxPrice = 3500, ModalPrice = 3150, LastUpdated = now, Trend = "+0.5%", IsUp = true },
        new MandiPrice { Commodity = "Paddy (Rice)", Market = "Gondia", Variety = "Basmati", MinPrice = 3500, MaxPrice = 4800, ModalPrice = 4200, LastUpdated = now, Trend = "-1.2%", IsUp = false },
        new MandiPrice { Commodity = "Soybean", Market = "Latur", Variety = "Yellow", MinPrice = 4100, MaxPrice = 5200, ModalPrice = 4750, LastUpdated = now, Trend = "+3.1%", IsUp = true },
        new MandiPrice { Commodity = "Onion", Market = "Nashik (Lasalgaon)", Variety = "Red Onion", MinPrice = 1200, MaxPrice = 2200, ModalPrice = 1800, LastUpdated = now, Trend = "-4.5%", IsUp = false },
        new MandiPrice { Commodity = "Potato", Market = "Mumbai", Variety = "Jyoti", MinPrice = 1500, MaxPrice = 2400, ModalPrice = 2000, LastUpdated = now, Trend = "+1.2%", IsUp = true },
        new MandiPrice { Commodity = "Tomato", Market = "Pimpri APMC", Variety = "Hybrid Tomato", MinPrice = 2000, MaxPrice = 3800, ModalPrice = 3000, LastUpdated = now, Trend = "+5.4%", IsUp = true },
        new MandiPrice { Commodity = "Maize", Market = "Amravati", Variety = "Yellow Maize", MinPrice = 1800, MaxPrice = 2400, ModalPrice = 2100, LastUpdated = now, Trend = "+0.8%", IsUp = true },
        new MandiPrice { Commodity = "Chickpeas (Chana)", Market = "Akola", Variety = "Desi Chana", MinPrice = 4800, MaxPrice = 5800, ModalPrice = 5300, LastUpdated = now, Trend = "-0.6%", IsUp = false });

    if (!await context.GovernmentSchemes.AnyAsync())
    {
        context.GovernmentSchemes.AddRange(
            new GovernmentScheme
            {
                Name = "PM Kisan Samman Nidhi",
                Description = "Income support to all landholding farmer families.",
                Benefit = "Rs 6,000 per year paid in three equal instalments",
                Eligibility = "Landholding farmer families with cultivable land",
                ApplicationLink = "https://pmkisan.gov.in/",
                Status = "Active"
            },
            new GovernmentScheme
            {
                Name = "Pradhan Mantri Fasal Bima Yojana",
                Description = "Crop insurance against non-preventable natural risks.",
                Benefit = "Premium of 2% (kharif) / 1.5% (rabi) of the sum insured",
                Eligibility = "All farmers growing notified crops in notified areas",
                ApplicationLink = "https://pmfby.gov.in/",
                Status = "Active"
            },
            new GovernmentScheme
            {
                Name = "Soil Health Card Scheme",
                Description = "Soil nutrient status and fertiliser recommendations for every holding.",
                Benefit = "Free soil testing and a crop-wise nutrient recommendation card",
                Eligibility = "All farmers",
                ApplicationLink = "https://soilhealth.dac.gov.in/",
                Status = "Active"
            },
            new GovernmentScheme
            {
                Name = "PM Krishi Sinchayee Yojana (Per Drop More Crop)",
                Description = "Micro-irrigation support to improve on-farm water use efficiency.",
                Benefit = "Up to 55% subsidy for small and marginal farmers on drip/sprinkler systems",
                Eligibility = "Farmers adopting micro-irrigation",
                ApplicationLink = "https://pmksy.gov.in/",
                Status = "Active"
            },
            new GovernmentScheme
            {
                Name = "Kisan Credit Card",
                Description = "Short term credit for cultivation and allied activities.",
                Benefit = "Crop loans at a 4% effective interest rate with prompt repayment",
                Eligibility = "Farmers, tenant farmers, share croppers and SHGs",
                ApplicationLink = "https://www.myscheme.gov.in/schemes/kcc",
                Status = "Active"
            });
    }

    await context.SaveChangesAsync();
}
