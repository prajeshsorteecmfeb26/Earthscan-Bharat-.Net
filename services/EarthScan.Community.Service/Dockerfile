# =============================================================================
# EarthScan Community Service
#
# IMPORTANT: build this from the repository ROOT, because the project compiles
# the original monolith sources that live in ./EarthScan.Backend:
#     docker build -f services/EarthScan.Community.Service/Dockerfile -t earthscan-community .
# docker compose already does this for you.
# =============================================================================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# --- restore (cached separately from the source copy) ---
COPY services/EarthScan.Community.Service/EarthScan.Community.Service.csproj services/EarthScan.Community.Service/
RUN dotnet restore services/EarthScan.Community.Service/EarthScan.Community.Service.csproj

# --- original monolith sources, linked by the .csproj ---
COPY EarthScan.Backend/ EarthScan.Backend/
COPY services/EarthScan.Community.Service/ services/EarthScan.Community.Service/

RUN dotnet publish services/EarthScan.Community.Service/EarthScan.Community.Service.csproj \
    -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
RUN mkdir -p wwwroot

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "EarthScan.Community.Service.dll"]
