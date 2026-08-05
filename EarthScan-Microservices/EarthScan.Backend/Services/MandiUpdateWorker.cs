using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using EarthScan.Backend.Data;
using EarthScan.Backend.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace EarthScan.Backend.Services
{
    public class MandiUpdateWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<MandiUpdateWorker> _logger;
        private readonly HttpClient _httpClient;

        public MandiUpdateWorker(IServiceProvider serviceProvider, ILogger<MandiUpdateWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _httpClient = new HttpClient();
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Mandi Update Background Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogInformation("Mandi Update Worker executing task...");
                await UpdateMandiPricesAsync();

                // Wait 24 hours before next execution
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
        }

        private async Task UpdateMandiPricesAsync()
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<EarthScanDbContext>();
                
                try
                {
                    var apiKey = Environment.GetEnvironmentVariable("DATA_GOV_IN_API_KEY");
                    bool updatedViaApi = false;

                    if (!string.IsNullOrEmpty(apiKey))
                    {
                        try
                        {
                            // AGMARKNET API on data.gov.in
                            string url = $"https://api.data.gov.in/resource/9ef8428a-d404-411a-8af2-0c342d2e2451?api-key={apiKey}&format=json&limit=50";
                            var response = await _httpClient.GetFromJsonAsync<JsonObject>(url);
                            if (response != null && response.TryGetPropertyValue("records", out var recordsNode) && recordsNode is JsonArray records)
                            {
                                foreach (var record in records)
                                {
                                    if (record == null) continue;
                                    var state = record["state"]?.ToString();
                                    if (state != null && state.Contains("Maharashtra", StringComparison.OrdinalIgnoreCase))
                                    {
                                        var commodity = record["commodity"]?.ToString();
                                        var variety = record["variety"]?.ToString() ?? "Regular";
                                        var market = record["market"]?.ToString() ?? "APMC";
                                        
                                        decimal.TryParse(record["min_price"]?.ToString(), out var minPrice);
                                        decimal.TryParse(record["max_price"]?.ToString(), out var maxPrice);
                                        decimal.TryParse(record["modal_price"]?.ToString(), out var modalPrice);

                                        if (modalPrice > 0)
                                        {
                                            var existing = context.MandiPrices
                                                .FirstOrDefault(m => m.Commodity == commodity && m.Market == market);

                                            if (existing != null)
                                            {
                                                existing.MinPrice = minPrice;
                                                existing.MaxPrice = maxPrice;
                                                existing.ModalPrice = modalPrice;
                                                existing.LastUpdated = DateTime.UtcNow;
                                                existing.Trend = modalPrice >= existing.ModalPrice ? $"+{((modalPrice - existing.ModalPrice) / existing.ModalPrice * 100):F1}%" : $"-{((existing.ModalPrice - modalPrice) / existing.ModalPrice * 100):F1}%";
                                                existing.IsUp = modalPrice >= existing.ModalPrice;
                                                
                                                context.MandiHistories.Add(new MandiHistory
                                                {
                                                    MandiPriceId = existing.Id,
                                                    Date = DateTime.UtcNow.Date,
                                                    Price = modalPrice
                                                });
                                            }
                                        }
                                    }
                                }
                                await context.SaveChangesAsync();
                                updatedViaApi = true;
                                _logger.LogInformation("Mandi cache updated successfully via data.gov.in API.");
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to update Mandi prices from live API. Falling back to local update.");
                        }
                    }

                    if (!updatedViaApi)
                    {
                        // Falling back to local realistic price fluctuation (simulation of live market)
                        var random = new Random();
                        var items = context.MandiPrices.ToList();
                        foreach (var item in items)
                        {
                            // Vary price by -1.5% to +2.5%
                            double percentChange = (random.NextDouble() * 4.0) - 1.5;
                            decimal oldPrice = item.ModalPrice;
                            decimal change = oldPrice * (decimal)(percentChange / 100.0);
                            
                            item.ModalPrice = Math.Round(oldPrice + change);
                            item.MinPrice = Math.Round(item.MinPrice + (change * 0.9m));
                            item.MaxPrice = Math.Round(item.MaxPrice + (change * 1.1m));
                            item.LastUpdated = DateTime.UtcNow;
                            item.Trend = percentChange >= 0 ? $"+{percentChange:F1}%" : $"{percentChange:F1}%";
                            item.IsUp = percentChange >= 0;

                            // Log daily history entry
                            context.MandiHistories.Add(new MandiHistory
                            {
                                MandiPriceId = item.Id,
                                Date = DateTime.UtcNow.Date,
                                Price = item.ModalPrice
                            });
                        }
                        await context.SaveChangesAsync();
                        _logger.LogInformation("Mandi cache updated locally (Heuristic Fluctuation).");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during Mandi price update task.");
                }
            }
        }
    }
}
