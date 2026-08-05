// ---------------------------------------------------------------------------
// EarthScan API Gateway (YARP reverse proxy).
//
// NEW FILE. The React frontend keeps talking to a single origin - by default
// http://localhost:5130, exactly the address the monolith used - and this
// gateway forwards each /api/... prefix to the microservice that owns it.
// No frontend or backend source had to change.
// ---------------------------------------------------------------------------
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy => policy.SetIsOriginAllowed(origin => true)
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

var app = builder.Build();

app.UseCors("AllowFrontend");

app.MapGet("/", () => Results.Ok(new
{
    service = "EarthScan API Gateway",
    routes = new[]
    {
        "/api/auth, /api/profile, /api/admin           -> identity service",
        "/api/lands, /api/soil                         -> land service",
        "/api/mandi, /api/schemes, /api/disease        -> agri service",
        "/api/groundwater                              -> water service",
        "/api/forum, /api/supportqueries, /api/ai      -> community service"
    }
}));

app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "gateway" }));

app.MapReverseProxy();

app.Run();
