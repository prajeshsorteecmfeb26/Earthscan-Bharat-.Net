# =============================================================================
# EarthScan Agri Service
#
# IMPORTANT: build this from the repository ROOT, because the project compiles
# the original monolith sources that live in ./EarthScan.Backend:
#     docker build -f services/EarthScan.Agri.Service/Dockerfile -t earthscan-agri .
# docker compose already does this for you.
# =============================================================================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# --- restore (cached separately from the source copy) ---
COPY services/EarthScan.Agri.Service/EarthScan.Agri.Service.csproj services/EarthScan.Agri.Service/
RUN dotnet restore services/EarthScan.Agri.Service/EarthScan.Agri.Service.csproj

# --- original monolith sources, linked by the .csproj ---
COPY EarthScan.Backend/ EarthScan.Backend/
COPY services/EarthScan.Agri.Service/ services/EarthScan.Agri.Service/

RUN dotnet publish services/EarthScan.Agri.Service/EarthScan.Agri.Service.csproj \
    -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "EarthScan.Agri.Service.dll"]
