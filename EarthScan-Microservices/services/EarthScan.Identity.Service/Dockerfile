# =============================================================================
# EarthScan Identity Service
#
# IMPORTANT: build this from the repository ROOT, because the project compiles
# the original monolith sources that live in ./EarthScan.Backend:
#     docker build -f services/EarthScan.Identity.Service/Dockerfile -t earthscan-identity .
# docker compose already does this for you.
# =============================================================================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# --- restore (cached separately from the source copy) ---
COPY services/EarthScan.Identity.Service/EarthScan.Identity.Service.csproj services/EarthScan.Identity.Service/
RUN dotnet restore services/EarthScan.Identity.Service/EarthScan.Identity.Service.csproj

# --- original monolith sources, linked by the .csproj ---
COPY EarthScan.Backend/ EarthScan.Backend/
COPY services/EarthScan.Identity.Service/ services/EarthScan.Identity.Service/

RUN dotnet publish services/EarthScan.Identity.Service/EarthScan.Identity.Service.csproj \
    -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
RUN mkdir -p wwwroot/uploads/profiles

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "EarthScan.Identity.Service.dll"]
