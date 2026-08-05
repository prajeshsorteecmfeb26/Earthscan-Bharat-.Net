# EarthScan — Dockerised Microservices Edition

This repository is your original **EarthScan** project with three things added:

1. **Microservices** — the monolith is split into 5 independently deployable services behind an API gateway.
2. **Docker** — a Dockerfile per service plus a single `docker compose up` for the whole stack.
3. **Automated tests** — xUnit + Moq (the .NET equivalents of JUnit + Mockito).

> **Not a single line of your existing C# / JSX / CSS was changed.**
> Every original file still lives in `EarthScan.Backend/` and `EarthScan.Frontend/`, byte for byte.
> The microservices do not *copy* your code — their `.csproj` files **link** it with
> `<Compile Include="..\..\EarthScan.Backend\...">`. Edit a controller in `EarthScan.Backend/`
> and every service that hosts it picks the change up on the next build.

---

## 1. Quick start

```bash
cp .env.example .env      # optional: add your Gemini / data.gov.in keys
docker compose up --build
```

| What | URL |
|---|---|
| React frontend | http://localhost:5173 |
| API gateway | http://localhost:5130 |
| Identity Swagger | http://localhost:5001/swagger |
| Land Swagger | http://localhost:5002/swagger |
| Agri Swagger | http://localhost:5003/swagger |
| Water Swagger | http://localhost:5004/swagger |
| Community Swagger | http://localhost:5005/swagger |
| MySQL | localhost:3307 (user `earthscan` / `earthscan`) |

The gateway deliberately listens on **5130** — the exact address your frontend's
`src/config.js` already defaults to — so the React app needed no change at all.

Seeded logins (created by the Identity service on first run, same as before):

| Email | Password | Role |
|---|---|---|
| admin@earthscan.com | `Admin@123` | Admin |
| expert@earthscan.com | `Expert@123` | Agriculture Expert |
| farmer@earthscan.com | `Farmer@123` | Farmer |

First boot takes a while: MySQL initialises, then each service retries its EF Core
migrations until the database answers (up to 15 attempts, 5 s apart).

---

## 2. Architecture

```
                            ┌───────────────────────────┐
  Browser  ──────────────▶  │  React SPA (nginx :5173)  │
                            └─────────────┬─────────────┘
                                          │  http://localhost:5130
                            ┌─────────────▼─────────────┐
                            │  API Gateway (YARP :5130) │
                            └──┬────┬────┬────┬────┬────┘
             /api/auth         │    │    │    │    │
             /api/profile ─────┘    │    │    │    │
             /api/admin             │    │    │    │
                                    │    │    │    │
             /api/lands  ───────────┘    │    │    │
             /api/soil                   │    │    │
                                         │    │    │
             /api/mandi   ───────────────┘    │    │
             /api/schemes                     │    │
             /api/disease                     │    │
                                              │    │
             /api/groundwater ────────────────┘    │
                                                   │
             /api/forum          ──────────────────┘
             /api/supportqueries
             /api/ai

  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
  │ Identity │ │   Land   │ │   Agri   │ │  Water   │ │  Community   │
  │  :5001   │ │  :5002   │ │  :5003   │ │  :5004   │ │    :5005     │
  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘
       │            │            │            │              │
  earthscan_   earthscan_   earthscan_   earthscan_    earthscan_
   identity        land         agri         water       community
  └──────────────────── one MySQL 8 container :3307 ─────────────────┘
```

### Service map

| Service | Port | Controllers (all your originals, linked unmodified) | Schema |
|---|---|---|---|
| **Identity** | 5001 | `AuthController`, `ProfileController`, `AdminController` | `earthscan_identity` |
| **Land** | 5002 | `LandsController`, `SoilController` (+ `GovernmentSatbaraService`) | `earthscan_land` |
| **Agri** | 5003 | `MandiController`, `SchemesController`, `DiseaseController` (+ `MandiUpdateWorker`) | `earthscan_agri` |
| **Water** | 5004 | `GroundwaterController` | `earthscan_water` |
| **Community** | 5005 | `ForumController`, `SupportQueriesController`, `AiController` | `earthscan_community` |
| **Gateway** | 5130 | YARP reverse proxy, no business logic | — |

All five services validate JWTs with the **same key, issuer and audience**, so a token
issued by `POST /api/auth/login` is accepted by every other service.

Static uploads keep working: the gateway routes `/uploads/profiles/*` to Identity,
`/uploads/lands/*` to Land and `/uploads/diseases/*` to Agri, and each of those has a
named Docker volume so images survive `docker compose down`.

---

## 3. Repository layout

```
EarthScan/
├── EarthScan.Backend/          ← YOUR ORIGINAL MONOLITH, UNTOUCHED
│                                 (still builds and runs on its own)
├── EarthScan.Frontend/         ← YOUR ORIGINAL REACT APP, UNTOUCHED
│   ├── Dockerfile              ← added
│   └── nginx.conf              ← added
├── services/
│   ├── EarthScan.Identity.Service/   Program.cs + csproj + Dockerfile only
│   ├── EarthScan.Land.Service/
│   ├── EarthScan.Agri.Service/
│   ├── EarthScan.Water.Service/
│   └── EarthScan.Community.Service/
├── gateway/EarthScan.Gateway/  ← YARP reverse proxy
├── tests/
│   ├── EarthScan.Identity.Tests/     xUnit + Moq
│   ├── EarthScan.Land.Tests/
│   ├── EarthScan.Agri.Tests/
│   ├── EarthScan.Water.Tests/
│   └── EarthScan.Community.Tests/
├── data/India_Groundwater_Analysis_2024.xlsx  ← CGWB dataset (Water service)
├── docker/mysql/init/01-create-databases.sql
├── docker-compose.yml
├── .env.example
└── EarthScan.Microservices.sln
```

### How the linking works

`services/EarthScan.Agri.Service/EarthScan.Agri.Service.csproj` (abridged):

```xml
<ItemGroup>
  <Compile Include="..\..\EarthScan.Backend\Models\*.cs"                    LinkBase="Shared\Models" />
  <Compile Include="..\..\EarthScan.Backend\DTOs\*.cs"                      LinkBase="Shared\DTOs" />
  <Compile Include="..\..\EarthScan.Backend\Data\EarthScanDbContext.cs"     LinkBase="Shared\Data" />
  <Compile Include="..\..\EarthScan.Backend\Migrations\*.cs"                LinkBase="Shared\Migrations" />
</ItemGroup>
<ItemGroup>
  <Compile Include="..\..\EarthScan.Backend\Controllers\MandiController.cs"   LinkBase="Shared\Controllers" />
  <Compile Include="..\..\EarthScan.Backend\Controllers\SchemesController.cs" LinkBase="Shared\Controllers" />
  <Compile Include="..\..\EarthScan.Backend\Controllers\DiseaseController.cs" LinkBase="Shared\Controllers" />
  <Compile Include="..\..\EarthScan.Backend\Services\MandiUpdateWorker.cs"    LinkBase="Shared\Services" />
</ItemGroup>
```

Each service therefore contains the shared model + `EarthScanDbContext` + migrations,
but only the controllers of its own bounded context. In Visual Studio the linked files
appear under a **Shared** folder with a shortcut icon.

---

## 4. Running without Docker

```bash
dotnet restore EarthScan.Microservices.sln

# five terminals, or use the VS multi-startup project setting
dotnet run --project services/EarthScan.Identity.Service     # :5001
dotnet run --project services/EarthScan.Land.Service         # :5002
dotnet run --project services/EarthScan.Agri.Service         # :5003
dotnet run --project services/EarthScan.Water.Service        # :5004
dotnet run --project services/EarthScan.Community.Service    # :5005
dotnet run --project gateway/EarthScan.Gateway               # :5130

cd EarthScan.Frontend && npm install && npm run dev
```

Point each service's `appsettings.json` `ConnectionStrings:DefaultConnection` at your
local MySQL first, and create the five schemas (or just run the MySQL container:
`docker compose up mysql`).

The original monolith still works exactly as before:

```bash
dotnet run --project EarthScan.Backend        # :5130 by launchSettings
```

---

## 5. Tests (xUnit + Moq)

Your project is **ASP.NET Core / C#**, so JUnit and Mockito do not apply.
The direct equivalents are used instead:

| Java | .NET | Used here |
|---|---|---|
| JUnit | **xUnit** | `[Fact]`, `[Theory]`, `[InlineData]` |
| Mockito | **Moq** | `new Mock<IFormFile>()`, `Setup(...)`, `Verify(...)` |
| H2 in-memory DB | **EF Core InMemory** | throw-away database per test |

```bash
dotnet test EarthScan.Microservices.sln

# or one suite at a time
dotnet test tests/EarthScan.Identity.Tests
```

### What is covered

| Suite | Tests |
|---|---|
| **Identity** | registration (BCrypt hashing, duplicate email), login (JWT shape, wrong password, unknown user), password reset, admin user CRUD + role guard, profile read/update, role-escalation is ignored, photo upload validation, activity history ordering |
| **Land** | listing CRUD, Satbara survey-number validation and unverified response, upload file-type guard, investment analysis argument/-404/-missing-key paths, soil report PDF-only + 5 MB guards, crop recommendation validation |
| **Agri** | cached mandi fallback when data.gov.in is not configured, commodity filtering, stored price history ordering, deterministic 7-day fallback series, scheme catalogue, disease upload validation (format, size, empty) |
| **Water** | state statistics lookup (found / case-insensitive / unknown), borewell planner argument validation, no search history written on failure |
| **Community** | forum posts ordering + comments, author taken from JWT claims, comment on missing post, support queries (newest-first, case-insensitive email, required fields, title truncation, reply flow), Krishi Mitra validation and missing-key path |

Every test runs fully offline: `Moq` supplies `IConfiguration` with **no** API keys, so no
controller ever reaches Gemini, data.gov.in, Open-Meteo or Nominatim during the suite.

Example (`tests/EarthScan.Identity.Tests/AuthControllerTests.cs`):

```csharp
[Fact]
public async Task Login_ReturnsTokenAndUser_ForValidCredentials()
{
    using var context = TestSupport.CreateContext();          // EF Core InMemory
    context.Users.Add(new User { /* ... */ });
    await context.SaveChangesAsync();

    var configuration = TestSupport.CreateConfigurationMock(); // Moq
    var controller = new AuthController(context, configuration.Object);

    var result = await controller.Login(new LoginRequest { /* ... */ });

    var ok = Assert.IsType<OkObjectResult>(result);
    Assert.Equal(3, TestSupport.ReadProperty(ok.Value, "token")!.ToString()!.Split('.').Length);
    configuration.Verify(c => c.GetSection("Jwt"), Times.Once);   // Mockito-style verify
}
```

---

## 6. Configuration

Anything in `appsettings.json` can be overridden with an environment variable using `__`
as the section separator — that is how `docker-compose.yml` injects everything:

| Variable | Meaning |
|---|---|
| `ConnectionStrings__DefaultConnection` | MySQL connection string for that service |
| `Jwt__Key`, `Jwt__Issuer`, `Jwt__Audience` | must be identical across all five services |
| `ApiKeys__Gemini` | Google Gemini key (Land, Agri, Community) |
| `ApiKeys__DataGov` | data.gov.in key (Agri, Water) |
| `Gemini__Model` | e.g. `gemini-3.6-flash` |
| `ReverseProxy__Clusters__<id>__Destinations__primary__Address` | gateway target for a service |

Put your keys in `.env` (see `.env.example`); they are read by `docker compose`.
**The API keys that were hard-coded in the original `appsettings.json` are still there,
in `EarthScan.Backend/appsettings.json`, because that file was not modified. Rotate them
before publishing this repository anywhere public.**

---

## 7. Known trade-offs of the database-per-service split

You asked for one schema per service **and** for no source changes, so two endpoints that
read across bounded contexts now only see their own schema:

| Endpoint | Behaviour | Why |
|---|---|---|
| `GET /api/profile/history/{userId}` | returns only rows in `earthscan_identity` | `ProfileController` reads `SoilReports`, `DiseasePredictions` and `AIChatHistories`, which are now written by the Land, Agri and Community services into their own schemas |
| `POST /api/ai/chat` | works, but the prompt has no mandi/scheme context | `AiController` reads `MandiPrices` / `GovernmentSchemes`, owned by the Agri service |

Both are wrapped in `try`/`catch` or plain LINQ in your original code, so nothing throws —
the data is simply empty. Every other endpoint is unaffected.

Fixing this properly means letting those two controllers call the sibling services over
HTTP (a ~40-line change to `ProfileController` and `AiController` only). Say the word and
I will add it. The alternative — pointing all five services at one shared schema — needs
no code change either: set every `ConnectionStrings__DefaultConnection` in
`docker-compose.yml` to the same database name.

---

## 8. Useful commands

```bash
docker compose up --build            # build + run everything
docker compose up -d mysql           # just the database
docker compose logs -f agri-service  # tail one service
docker compose down                  # stop
docker compose down -v               # stop and wipe the database volume

dotnet build EarthScan.Microservices.sln
dotnet test  EarthScan.Microservices.sln

curl http://localhost:5130/          # gateway route table
curl http://localhost:5001/health    # per-service health probe
```
