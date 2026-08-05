# =============================================================================
# EarthScan API Gateway (YARP). Build from the repository ROOT.
# =============================================================================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY gateway/EarthScan.Gateway/EarthScan.Gateway.csproj gateway/EarthScan.Gateway/
RUN dotnet restore gateway/EarthScan.Gateway/EarthScan.Gateway.csproj

COPY gateway/EarthScan.Gateway/ gateway/EarthScan.Gateway/
RUN dotnet publish gateway/EarthScan.Gateway/EarthScan.Gateway.csproj \
    -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "EarthScan.Gateway.dll"]
