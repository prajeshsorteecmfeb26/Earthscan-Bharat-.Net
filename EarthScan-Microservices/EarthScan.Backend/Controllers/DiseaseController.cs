using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using EarthScan.Backend.Data;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace EarthScan.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DiseaseController : ControllerBase
    {
        private readonly EarthScanDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public DiseaseController(EarthScanDbContext context, IConfiguration configuration)
        {
            _context = context;
            _httpClient = new HttpClient();
            _configuration = configuration;
        }

        [HttpPost("detect")]
        public async Task<IActionResult> DetectDisease([FromForm] IFormFile file, [FromForm] int userId, [FromForm] string cropCategory = "General", [FromForm] string? lang = null)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No leaf/crop image file uploaded." });
            }

            // 1. Secure file validation
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            var extension = System.IO.Path.GetExtension(file.FileName).ToLowerInvariant();
            if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
            {
                return BadRequest(new { message = "Invalid file type. Only JPG, JPEG, PNG, and WEBP images are allowed." });
            }

            if (file.Length > 5 * 1024 * 1024)
            {
                return BadRequest(new { message = "Image size exceeds the maximum limit of 5 MB." });
            }

            try
            {
                // 2. Save file securely to folder using GUID name
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "diseases");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                var uniqueFileName = $"{Guid.NewGuid()}{extension}";
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);
                var relativePath = $"/uploads/diseases/{uniqueFileName}";

                byte[] fileBytes;
                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(fileStream);
                }
                
                fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
                string base64Image = Convert.ToBase64String(fileBytes);

                string apiKey = _configuration["ApiKeys:Gemini"];
                if (string.IsNullOrEmpty(apiKey))
                {
                    return StatusCode(500, new { message = "Gemini API key is not configured." });
                }

                string languageInstruction = "";
                if (!string.IsNullOrEmpty(lang))
                {
                    var cleanLang = lang.Trim().ToLower();
                    if (cleanLang.StartsWith("hi"))
                    {
                        languageInstruction = "CRITICAL INSTRUCTION: You MUST translate every JSON string value (except selectedCrop) into clean, natural Hindi (हिंदी). For example, the disease name, detectedCrop, cause, symptoms, treatment, preventive measures, and messages MUST be written fully in Hindi.\n";
                    }
                    else if (cleanLang.StartsWith("mr"))
                    {
                        languageInstruction = "CRITICAL INSTRUCTION: You MUST translate every JSON string value (except selectedCrop) into clean, natural Marathi (मराठी). For example, the disease name, detectedCrop, cause, symptoms, treatment, preventive measures, and messages MUST be written fully in Marathi.\n";
                    }
                }

                string prompt = $@"{languageInstruction}Analyze this crop leaf image. Selected Crop Category: '{cropCategory}'.
1. Determine if the uploaded leaf image matches the crop category '{cropCategory}'. Set 'isMatch' to true if yes, and false if no.
2. In 'detectedCrop', specify the crop category you detect in the image (e.g. Cotton, Rice, Sugarcane, Wheat, Maize, Tomato, Potato, Onion, etc.).
3. In 'message', write: 'Uploaded image appears to be [detectedCrop], not {cropCategory}.' if 'isMatch' is false, or write details of matching if true.
4. If 'isMatch' is true, identify the plant disease or deficiency, and populate:
   - 'disease' / 'DiseaseName': name of the disease/deficiency.
   - 'confidence': confidence percentage (integer, e.g. 92).
   - 'symptoms' / 'Cause': symptoms/cause.
   - 'treatment' / 'Treatment': organic treatment.
   - 'prevention' / 'PreventiveMeasures' / 'FertilizerSuggestion': prevention/chemical treatment.

Return strictly a valid JSON object matching this schema exactly without markdown formatting:
{{
  ""isMatch"": true,
  ""selectedCrop"": ""{cropCategory}"",
  ""detectedCrop"": ""crop name"",
  ""message"": ""string"",
  ""disease"": ""disease name"",
  ""confidence"": 95,
  ""symptoms"": ""symptoms/cause details"",
  ""treatment"": ""treatment details"",
  ""prevention"": ""prevention details"",
  ""DiseaseName"": ""disease name"",
  ""Cause"": ""symptoms/cause details"",
  ""Treatment"": ""organic treatment"",
  ""FertilizerSuggestion"": ""chemical treatment/fertilizer suggestion"",
  ""PreventiveMeasures"": ""preventive measures""
}}";

                // Use configurable model version
                string model = _configuration["Gemini:Model"] ?? "gemini-3.6-flash";
                string url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                var requestBody = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new object[]
                            {
                                new { text = prompt },
                                new { inlineData = new { mimeType = file.ContentType, data = base64Image } }
                            }
                        }
                    },
                    generationConfig = new { responseMimeType = "application/json" }
                };

                var response = await _httpClient.PostAsJsonAsync(url, requestBody);
                if (!response.IsSuccessStatusCode)
                {
                    var errorDetails = await response.Content.ReadAsStringAsync();
                    return StatusCode((int)response.StatusCode, new { message = "Gemini Vision API request failed.", details = errorDetails });
                }

                var jsonNode = await response.Content.ReadFromJsonAsync<JsonNode>();
                var jsonText = jsonNode?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.ToString();

                if (string.IsNullOrEmpty(jsonText))
                {
                    return StatusCode(500, new { message = "Received empty response from AI." });
                }

                jsonText = ExtractJson(jsonText);
                var extracted = JsonSerializer.Deserialize<JsonObject>(jsonText);
                
                if (extracted == null) return StatusCode(500, new { message = "Failed to parse AI JSON response." });

                bool isMatchVal = true;
                if (extracted.TryGetPropertyValue("isMatch", out var imNode) && imNode != null)
                {
                    bool.TryParse(imNode.ToString(), out isMatchVal);
                }

                if (isMatchVal)
                {
                    string diseaseName = extracted["disease"]?.ToString() ?? extracted["DiseaseName"]?.ToString() ?? "Unknown";
                    string cause = extracted["symptoms"]?.ToString() ?? extracted["Cause"]?.ToString() ?? "N/A";
                    string treatment = extracted["treatment"]?.ToString() ?? extracted["Treatment"]?.ToString() ?? "N/A";
                    string preventive = extracted["prevention"]?.ToString() ?? extracted["PreventiveMeasures"]?.ToString() ?? "N/A";
                    double.TryParse(extracted["confidence"]?.ToString() ?? "95.0", out var confidenceVal);

                    var prediction = new DiseasePrediction
                    {
                        UserId = userId,
                        ImagePath = relativePath,
                        DiseaseName = diseaseName,
                        Confidence = confidenceVal,
                        Symptoms = cause,
                        OrganicTreatment = treatment,
                        ChemicalTreatment = preventive,
                        AgricultureOffice = "State Department of Agriculture",
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.DiseasePredictions.Add(prediction);
                    await _context.SaveChangesAsync();
                }

                return Ok(extracted);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        private static string ExtractJson(string input)
        {
            if (string.IsNullOrEmpty(input)) return string.Empty;
            int firstBrace = input.IndexOf('{');
            int firstBracket = input.IndexOf('[');
            
            int start = -1;
            int end = -1;
            
            if (firstBrace != -1 && (firstBracket == -1 || firstBrace < firstBracket))
            {
                start = firstBrace;
                end = input.LastIndexOf('}');
            }
            else if (firstBracket != -1)
            {
                start = firstBracket;
                end = input.LastIndexOf(']');
            }
            
            if (start != -1 && end != -1 && end > start)
            {
                return input.Substring(start, end - start + 1);
            }
            
            return input.Trim();
        }
    }
}