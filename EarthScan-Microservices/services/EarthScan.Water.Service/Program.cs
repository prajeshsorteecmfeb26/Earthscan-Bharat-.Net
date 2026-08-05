// ---------------------------------------------------------------------------
// EarthScan Water microservice.
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
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "EarthScan Water Service", Version = "v1" });
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

// --- Database (this service owns the 'earthscan_water' schema) --------------------
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
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "water" }));

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
            application.Logger.LogInformation("[water] Database ready.");
            return;
        }
        catch (Exception ex)
        {
            application.Logger.LogWarning(
                "[water] Database not ready (attempt {Attempt}/{MaxAttempts}): {Message}",
                attempt, maxAttempts, ex.Message);

            if (attempt == maxAttempts)
            {
                application.Logger.LogError(ex, "[water] Giving up on database initialisation.");
                return;
            }

            await Task.Delay(delay);
        }
    }
}

async Task SeedAsync(EarthScanDbContext context)
{
    // This service owns no seed data.
    await Task.CompletedTask;
}
