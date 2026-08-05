using System;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text.RegularExpressions;

namespace EarthScan.Backend.Services
{
    public class GovernmentSatbaraService
    {
        private readonly HttpClient _httpClient;

        public GovernmentSatbaraService(HttpClient httpClient)
        {
            _httpClient = httpClient;
            // Configure headers to mimic a real browser to pass basic security checks
            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            _httpClient.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
            _httpClient.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.5");
            _httpClient.DefaultRequestHeaders.Add("Referer", "https://bhulekh.mahabhumi.gov.in/");
        }

        public async Task<bool> InitializeSessionAsync()
        {
            try
            {
                // Ping the official Maharashtra land records portal
                var mainPageUrl = "https://bhulekh.mahabhumi.gov.in/";
                var response = await _httpClient.GetAsync(mainPageUrl);
                if (response.IsSuccessStatusCode)
                {
                    var html = await response.Content.ReadAsStringAsync();
                    var viewState = ExtractAspVariable(html, "__VIEWSTATE");
                    Console.WriteLine($"[GovernmentSatbaraService] Successfully initialized session with https://bhulekh.mahabhumi.gov.in/. ViewState size: {viewState.Length}");
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GovernmentSatbaraService] Failed to establish connection to bhulekh.mahabhumi.gov.in: {ex.Message}");
                return false;
            }
        }

        private string ExtractAspVariable(string html, string variableName)
        {
            var match = Regex.Match(html, $"id=\"{variableName}\"\\s+value=\"([^\"]+)\"");
            return match.Success ? match.Groups[1].Value : string.Empty;
        }
    }
}
