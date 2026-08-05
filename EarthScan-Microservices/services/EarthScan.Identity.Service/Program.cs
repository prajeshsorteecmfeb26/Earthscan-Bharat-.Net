// ---------------------------------------------------------------------------
// EarthScan Identity microservice.
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
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "EarthScan Identity Service", Version = "v1" });
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

// --- Database (this service owns the 'earthscan_identity' schema) --------------------
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<EarthScanDbContext>(options =>
    options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 36))));

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
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "identity" }));

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
            application.Logger.LogInformation("[identity] Database ready.");
            return;
        }
        catch (Exception ex)
        {
            application.Logger.LogWarning(
                "[identity] Database not ready (attempt {Attempt}/{MaxAttempts}): {Message}",
                attempt, maxAttempts, ex.Message);

            if (attempt == maxAttempts)
            {
                application.Logger.LogError(ex, "[identity] Giving up on database initialisation.");
                return;
            }

            await Task.Delay(delay);
        }
    }
}

async Task SeedAsync(EarthScanDbContext context)
{
    // Same default accounts the monolith created on first run.
    if (await context.Users.AnyAsync())
    {
        return;
    }

    context.Users.AddRange(
        new User
        {
            Name = "Admin User",
            Email = "admin@earthscan.com",
            Role = "Admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123")
        },
        new User
        {
            Name = "Agriculture Expert",
            Email = "expert@earthscan.com",
            Role = "Agriculture Expert",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Expert@123")
        },
        new User
        {
            Name = "Farmer User",
            Email = "farmer@earthscan.com",
            Role = "Farmer",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Farmer@123")
        });

    await context.SaveChangesAsync();
}
