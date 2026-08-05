using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using EarthScan.Backend.Data;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace EarthScan.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AiController : ControllerBase
    {
        private readonly EarthScanDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public AiController(EarthScanDbContext context, IConfiguration configuration)
        {
            _context = context;
            _httpClient = new HttpClient();
            _configuration = configuration;
        }

        public class ChatRequest
        {
            public int UserId { get; set; }
            public string Question { get; set; } = string.Empty;
            public string Location { get; set; } = string.Empty;
            public string SoilInfo { get; set; } = string.Empty;
            public string WeatherInfo { get; set; } = string.Empty;
            public string? Lang { get; set; }
        }

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Question))
            {
                return BadRequest("Question cannot be empty.");
            }

            var apiKey = _configuration["ApiKeys:Gemini"];
            if (string.IsNullOrEmpty(apiKey))
            {
                return StatusCode(500, "Gemini API key is not configured.");
            }

            string mandiContext = "";
            string schemesContext = "";
            try
            {
                var prices = await _context.MandiPrices.Take(5).ToListAsync();
                mandiContext = string.Join("; ", prices.Select(p => $"{p.Commodity} at {p.Market}: Modal ₹{p.ModalPrice}/q"));
                
                var schemes = await _context.GovernmentSchemes.Take(5).ToListAsync();
                schemesContext = string.Join("; ", schemes.Select(s => $"{s.Name}: {s.Benefit}"));
            }
            catch { }

            string languageInstruction = "";
            if (!string.IsNullOrEmpty(request.Lang))
            {
                var cleanLang = request.Lang.Trim().ToLower();
                if (cleanLang.StartsWith("hi"))
                {
                    languageInstruction = "\nIMPORTANT: You must reply strictly in Hindi (हिंदी) language.";
                }
                else if (cleanLang.StartsWith("mr"))
                {
                    languageInstruction = "\nIMPORTANT: You must reply strictly in Marathi (मराठी) language.";
                }
            }

            string systemPrompt = $@"You are 'Krishi Mitra', an agricultural AI advisory assistant.
Context:
- Location: {request.Location}
- Weather: {request.WeatherInfo}
- Soil: {request.SoilInfo}
- Mandi Rates: {mandiContext}
- Schemes: {schemesContext}

Answer the farmer's question using this context in markdown format. Question: ""{request.Question}""{languageInstruction}";

            try
            {
                // Use configurable model version
                string model = _configuration["Gemini:Model"] ?? "gemini-3.5-flash";
                string url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                var requestBody = new
                {
                    contents = new[] { new { parts = new[] { new { text = systemPrompt } } } }
                };

                var response = await _httpClient.PostAsJsonAsync(url, requestBody);
                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
                }

                var jsonNode = await response.Content.ReadFromJsonAsync<JsonNode>();
                var answerText = jsonNode?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.ToString();

                if (string.IsNullOrEmpty(answerText)) return StatusCode(500, "Empty response from AI.");

                var historyNode = new AIChatHistory
                {
                    UserId = request.UserId,
                    Question = request.Question,
                    Answer = answerText,
                    Location = request.Location,
                    CreatedAt = DateTime.UtcNow
                };
                _context.AIChatHistories.Add(historyNode);
                await _context.SaveChangesAsync();

                return Ok(new { answer = answerText });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal Server Error: {ex.Message}");
            }
        }
    }
}