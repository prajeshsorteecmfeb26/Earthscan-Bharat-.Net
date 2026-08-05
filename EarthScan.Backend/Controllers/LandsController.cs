using System;
using System.Collections.Generic;
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
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

using Microsoft.AspNetCore.Authorization;

namespace EarthScan.Backend.Controllers
{
    public class SatbaraResultDto
    {
        public string? State { get; set; }
        public string? FormName { get; set; }
        public string? District { get; set; }
        public string? Taluka { get; set; }
        public string? Village { get; set; }
        public string? SurveyNo { get; set; }
        public string? OwnerName { get; set; }
        public string? OwnerPhone { get; set; }
        public string? Tenure { get; set; }
        public string? TotalArea { get; set; }
        public string? CultivableArea { get; set; }
        public string? Potkharaba { get; set; }
        public string? AssessmentTax { get; set; }
        public string? IrrigationSource { get; set; }
        public string? HasWell { get; set; }
        public string? OtherRights { get; set; }
        public string? MutationReferences { get; set; }
        public string? Ulpin { get; set; }
        public System.Text.Json.Nodes.JsonNode? CropHistory { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    public class LandsController : ControllerBase
    {
        private readonly EarthScanDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        public LandsController(EarthScanDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
            _httpClient = new HttpClient();
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Land>>> GetLands()
        {
            return await _context.Lands.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Land>> GetLand(int id)
        {
            var land = await _context.Lands.FindAsync(id);
            if (land == null) return NotFound(new { message = "Land record not found." });
            return land;
        }

        public class SellLandRequest
        {
            public int OwnerId { get; set; }
            public string Title { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public string Location { get; set; } = string.Empty;
            public decimal Price { get; set; }
            public string ContactNumber { get; set; } = string.Empty;
            public double AreaSize { get; set; }
            public string SoilType { get; set; } = string.Empty;
            public double GroundwaterLevelDepth { get; set; }
            public double Latitude { get; set; }
            public double Longitude { get; set; }
            public IFormFile? Photo { get; set; }
            public List<IFormFile>? Photos { get; set; }
            public string? SatbaraUrl { get; set; }
        }

        [HttpPost("sell")]
        public async Task<IActionResult> SellLand([FromForm] SellLandRequest request)
        {
            if (request == null) return BadRequest("Invalid land details.");

            var imagePaths = new List<string>();
            
            if (!string.IsNullOrEmpty(request.SatbaraUrl))
            {
                imagePaths.Add(request.SatbaraUrl);
            }

            var allPhotos = new List<IFormFile>();

            if (request.Photo != null) allPhotos.Add(request.Photo);
            if (request.Photos != null) allPhotos.AddRange(request.Photos);

            foreach (var photo in allPhotos)
            {
                if (photo.Length > 0)
                {
                    var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
                    var extension = Path.GetExtension(photo.FileName).ToLowerInvariant();
                    if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
                    {
                        return BadRequest("Invalid photo file type. Only JPG, JPEG, PNG, and WEBP images are allowed.");
                    }

                    if (photo.Length > 5 * 1024 * 1024)
                    {
                        return BadRequest("Photo file size exceeds the maximum limit of 5 MB.");
                    }

                    var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "lands");
                    if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                    var uniqueFileName = $"{Guid.NewGuid()}{extension}";
                    var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await photo.CopyToAsync(stream);
                    }
                    imagePaths.Add($"/uploads/lands/{uniqueFileName}");
                }
            }

            string finalImagePath = string.Join(",", imagePaths);

            double latitude = request.Latitude;
            double longitude = request.Longitude;

            // Geocode location string if coordinates are not provided
            if (latitude == 0 && longitude == 0 && !string.IsNullOrEmpty(request.Location))
            {
                try
                {
                    using (var client = new HttpClient())
                    {
                        client.DefaultRequestHeaders.Add("User-Agent", "EarthScanApp");
                        var response = await client.GetAsync($"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(request.Location)}&format=json&limit=1");
                        if (response.IsSuccessStatusCode)
                        {
                            var content = await response.Content.ReadAsStringAsync();
                            using (var json = JsonDocument.Parse(content))
                            {
                                if (json.RootElement.ValueKind == JsonValueKind.Array && json.RootElement.GetArrayLength() > 0)
                                {
                                    var first = json.RootElement[0];
                                    double.TryParse(first.GetProperty("lat").GetString(), out latitude);
                                    double.TryParse(first.GetProperty("lon").GetString(), out longitude);
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Geocoding failed in backend: " + ex.Message);
                }
            }

            // Apply default coordinate fallbacks if geocoding also returned 0
            if (latitude == 0 && longitude == 0)
            {
                latitude = 18.5204;
                longitude = 73.8567;
            }

            var land = new Land
            {
                OwnerId = request.OwnerId,
                Title = request.Title,
                Description = request.Description,
                Location = request.Location,
                Price = request.Price,
                ContactNumber = request.ContactNumber,
                SizeInAcres = request.AreaSize,
                SoilType = request.SoilType,
                GroundwaterLevelDepth = request.GroundwaterLevelDepth,
                ImagePath = finalImagePath,
                Latitude = latitude,
                Longitude = longitude,
                LandIntelligenceScore = CalculateDynamicIntelligenceScore(request.SoilType, request.GroundwaterLevelDepth),
                BorewellSuccessProbability = CalculateDynamicBorewellProbability(request.SoilType, request.GroundwaterLevelDepth),
                CreatedAt = DateTime.UtcNow
            };

            _context.Lands.Add(land);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetLand", new { id = land.Id }, new { message = "Land listed for sale successfully.", land });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteLand(int id)
        {
            var land = await _context.Lands.FindAsync(id);
            if (land == null) return NotFound(new { message = "Land record not found." });

            _context.Lands.Remove(land);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Land deleted successfully." });
        }

        [HttpGet("satbara")]
        public async Task<IActionResult> GetSatbaraDetails([FromQuery] string surveyNo, [FromQuery] string? phone, [FromQuery] string? location)
        {
            if (string.IsNullOrEmpty(surveyNo))
            {
                return BadRequest(new { message = "Survey number is required." });
            }

            // Real live captcha/session-based Mahabhulekh integration is disabled/under development
            Console.WriteLine($"LIVE FETCH FAILED: {surveyNo}");

            return Ok(new
            {
                verified = false,
                message = "Official Mahabhulekh data could not be fetched or extracted"
            });
        }

        [HttpPost("satbara/upload")]
        public async Task<IActionResult> UploadSatbara(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file uploaded." });
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowedExtensions = new[] { ".pdf", ".docx", ".jpg", ".jpeg", ".png", ".webp" };
            if (!allowedExtensions.Contains(extension))
            {
                return BadRequest(new { message = "Invalid file type. Supported types: PDF, DOCX, JPG, JPEG, PNG, WEBP." });
            }

            string rawText = string.Empty;

            try
            {
                using (var stream = file.OpenReadStream())
                {
                    if (extension == ".pdf")
                    {
                        using (var document = UglyToad.PdfPig.PdfDocument.Open(stream))
                        {
                            var textBuilder = new System.Text.StringBuilder();
                            foreach (var page in document.GetPages())
                            {
                                textBuilder.AppendLine(page.Text);
                            }
                            rawText = textBuilder.ToString();
                        }
                    }
                    else if (extension == ".docx")
                    {
                        rawText = ExtractTextFromDocx(stream);
                    }
                    else // Image formats (.jpg, .jpeg, .png, .webp)
                    {
                        rawText = await PerformGeminiOcr(stream, extension);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Text extraction failed: " + ex.Message);
                return BadRequest(new { verified = false, message = "Official Mahabhulekh data could not be extracted" });
            }

            if (string.IsNullOrWhiteSpace(rawText))
            {
                return BadRequest(new { verified = false, message = "Official Mahabhulekh data could not be extracted" });
            }

            // Log raw text for debugging, as requested
            Console.WriteLine("=== RAW EXTRACTED SATBARA TEXT ===");
            Console.WriteLine(rawText);
            Console.WriteLine("===================================");

            // Parse text using Gemini API with no fabrication rules
            try
            {
                var parsed = await ParseSatbaraTextWithGemini(rawText);
                if (parsed != null)
                {
                    var extracted = new SatbaraResultDto
                    {
                        OwnerName = parsed.ContainsKey("ownerName") ? parsed["ownerName"]?.ToString() : null,
                        TotalArea = parsed.ContainsKey("totalArea") ? parsed["totalArea"]?.ToString() : null,
                        CultivableArea = parsed.ContainsKey("cultivableArea") ? parsed["cultivableArea"]?.ToString() : null,
                        Potkharaba = parsed.ContainsKey("potkharaba") ? parsed["potkharaba"]?.ToString() : null,
                        IrrigationSource = parsed.ContainsKey("irrigationSource") ? parsed["irrigationSource"]?.ToString() : null,
                        HasWell = parsed.ContainsKey("hasWell") ? parsed["hasWell"]?.ToString() : null,
                        MutationReferences = parsed.ContainsKey("mutationReferences") ? parsed["mutationReferences"]?.ToString() : null,
                        Ulpin = parsed.ContainsKey("ulpin") ? parsed["ulpin"]?.ToString() : null
                    };

                    string? surveyNo = parsed.ContainsKey("surveyNo") ? parsed["surveyNo"]?.ToString()?.Trim() : null;

                    // 6. Add the debug log
                    Console.WriteLine($"Survey: {surveyNo}, Owner: {extracted.OwnerName}, Area: {extracted.TotalArea}");

                    // 3. Create a new object exactly as requested by user instructions
                    var satbaraData = new SatbaraResultDto
                    {
                        OwnerName = extracted.OwnerName,
                        TotalArea = extracted.TotalArea,
                        CultivableArea = extracted.CultivableArea,
                        Potkharaba = extracted.Potkharaba,
                        IrrigationSource = extracted.IrrigationSource,
                        HasWell = extracted.HasWell,
                        MutationReferences = extracted.MutationReferences,
                        Ulpin = extracted.Ulpin
                    };

                    // Populate remaining fields strictly from parsed Mahabhulekh PDF to prevent UI crash
                    satbaraData.State = parsed.ContainsKey("state") ? parsed["state"]?.ToString() : null;
                    satbaraData.FormName = parsed.ContainsKey("formName") ? parsed["formName"]?.ToString() : null;
                    satbaraData.District = parsed.ContainsKey("district") ? parsed["district"]?.ToString() : null;
                    satbaraData.Taluka = parsed.ContainsKey("taluka") ? parsed["taluka"]?.ToString() : null;
                    satbaraData.Village = parsed.ContainsKey("village") ? parsed["village"]?.ToString() : null;
                    satbaraData.SurveyNo = parsed.ContainsKey("surveyNo") ? parsed["surveyNo"]?.ToString() : null;
                    satbaraData.OwnerPhone = parsed.ContainsKey("ownerPhone") ? parsed["ownerPhone"]?.ToString() : null;
                    satbaraData.Tenure = parsed.ContainsKey("tenure") ? parsed["tenure"]?.ToString() : null;
                    satbaraData.AssessmentTax = parsed.ContainsKey("assessmentTax") ? parsed["assessmentTax"]?.ToString() : null;
                    satbaraData.OtherRights = parsed.ContainsKey("otherRights") ? parsed["otherRights"]?.ToString() : null;
                    satbaraData.CropHistory = parsed.ContainsKey("cropHistory") ? parsed["cropHistory"] : null;

                    return Ok(satbaraData);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Failed to parse extracted text with Gemini: " + ex.Message);
            }

            return BadRequest(new { verified = false, message = "Official Mahabhulekh data could not be extracted" });
        }

        private static string ExtractTextFromDocx(Stream docxStream)
        {
            try
            {
                using (var archive = new System.IO.Compression.ZipArchive(docxStream, System.IO.Compression.ZipArchiveMode.Read, true))
                {
                    var entry = archive.GetEntry("word/document.xml");
                    if (entry != null)
                    {
                        using (var entryStream = entry.Open())
                        {
                            var doc = System.Xml.Linq.XDocument.Load(entryStream);
                            System.Xml.Linq.XNamespace w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
                            var textElements = doc.Descendants(w + "t");
                            return string.Join(" ", textElements.Select(e => e.Value));
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error reading DOCX: " + ex.Message);
            }
            return string.Empty;
        }

        private async Task<string> PerformGeminiOcr(Stream imageStream, string extension)
        {
            string apiKey = _configuration["ApiKeys:Gemini"];
            if (string.IsNullOrEmpty(apiKey))
            {
                throw new Exception("Gemini API key is not configured.");
            }

            byte[] imageBytes;
            using (var ms = new MemoryStream())
            {
                await imageStream.CopyToAsync(ms);
                imageBytes = ms.ToArray();
            }

            string mimeType = extension switch
            {
                ".png" => "image/png",
                ".webp" => "image/webp",
                _ => "image/jpeg"
            };

            string base64Image = Convert.ToBase64String(imageBytes);
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
                            new { text = "Perform high-accuracy OCR on this image of a Maharashtra 7/12 Satbara document. Extract and return all readable text, preserving the layout and Marathi unicode characters as closely as possible." },
                            new { inlineData = new { mimeType = mimeType, data = base64Image } }
                        }
                    }
                }
            };

            using (var client = new HttpClient())
            {
                var response = await client.PostAsJsonAsync(url, requestBody);
                if (response.IsSuccessStatusCode)
                {
                    var jsonNode = await response.Content.ReadFromJsonAsync<JsonNode>();
                    var text = jsonNode?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.ToString();
                    return text ?? string.Empty;
                }
            }
            return string.Empty;
        }

        private async Task<JsonObject?> ParseSatbaraTextWithGemini(string rawText)
        {
            string apiKey = _configuration["ApiKeys:Gemini"];
            if (string.IsNullOrEmpty(apiKey))
            {
                throw new Exception("Gemini API key is not configured.");
            }

            string model = _configuration["Gemini:Model"] ?? "gemini-3.6-flash";
            string url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

            string prompt = $@"You are an official Mahabhulekh document parser.
Analyze the following raw text from an uploaded 7/12 Satbara extract.
Raw Text:
{rawText}

Extract the official land registry details.
CRITICAL RULES:
1. The raw text is in Marathi (Devanagari script) or English. You must translate or map the Marathi unicode labels to the corresponding English JSON keys:
   - 'गाव' / 'मौज' -> 'village'
   - 'तालुका' -> 'taluka'
   - 'जिल्हा' -> 'district'
   - 'गट क्रमांक' / 'सर्व्हे नंबर' -> 'surveyNo'
   - 'खातेदाराचे नाव' / 'खातेदारांचे नाव' / 'नाव' / 'इतर हक्क' -> 'ownerName' (extract the main landowner's name, e.g. 'विलास धोंडिराम ढवळे' or 'Vilas Dhondiram Dawade')
   - 'एकूण क्षेत्र' / 'क्षेत्र' -> 'totalArea' (e.g. '१.१८ हे.आर.' / '1.18 Hectares')
   - 'लागवडीयोग्य' -> 'cultivableArea' (e.g. '१.०१ हे.आर.' / '1.01 Hectares')
   - 'पोटखराबा' / 'पोट खराबा' -> 'potkharaba' (e.g. '०.१७ हे.आर.' / '0.17 Hectares')
   - 'आकारणी' / 'आकार' -> 'assessmentTax'
   - 'सिंचन साधन' -> 'irrigationSource'
   - 'विहीर' -> 'hasWell'
2. Do NOT fabricate any fields. Do NOT infer missing values.
3. If a field is not present or mentioned in the text (either in Marathi or English), you MUST return null for that field. Do NOT guess or default them.
4. For landowner name, keep the original name (in English and Marathi if present).
5. Return strictly a JSON object matching this schema exactly, without any markdown formatting or comments:
{{
  ""state"": ""[Government of Maharashtra / etc or null]"",
  ""formName"": ""[FORM VII (गाव नमुना सात) / etc or null]"",
  ""district"": ""[District name or null]"",
  ""taluka"": ""[Taluka name or null]"",
  ""village"": ""[Village name or null]"",
  ""surveyNo"": ""[Survey / Gat number or null]"",
  ""ownerName"": ""[Owner name or null]"",
  ""ownerPhone"": ""[Owner phone if present in text, or null]"",
  ""tenure"": ""[Tenure type or null]"",
  ""totalArea"": ""[Total area or null]"",
  ""cultivableArea"": ""[Cultivable area or null]"",
  ""potkharaba"": ""[Potkharaba area or null]"",
  ""assessmentTax"": ""[Assessment tax or null]"",
  ""irrigationSource"": [null or string],
  ""hasWell"": [null or string],
  ""otherRights"": ""[Other rights or null]"",
  ""mutationReferences"": [null or string],
  ""ulpin"": [null or string],
  ""cropHistory"": [
    // Array of objects with year, crop, area, season. If missing, output empty array []
  ]
}}";

            var requestBody = new
            {
                contents = new[] { new { parts = new[] { new { text = prompt } } } },
                generationConfig = new { responseMimeType = "application/json" }
            };

            using (var client = new HttpClient())
            {
                var response = await client.PostAsJsonAsync(url, requestBody);
                if (response.IsSuccessStatusCode)
                {
                    var jsonNode = await response.Content.ReadFromJsonAsync<JsonNode>();
                    var jsonText = jsonNode?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.ToString();
                    if (!string.IsNullOrEmpty(jsonText))
                    {
                        jsonText = ExtractJson(jsonText);
                        return JsonSerializer.Deserialize<JsonObject>(jsonText);
                    }
                }
            }
            return null;
        }

        [HttpGet("{id}/analyze")]
        public async Task<IActionResult> GetInvestmentAnalysis(int id, [FromQuery] string crop, [FromQuery] int? userId, [FromQuery] string? lang)
        {
            if (string.IsNullOrWhiteSpace(crop)) return BadRequest(new { message = "Crop name is required for investment analysis." });

            var land = await _context.Lands.FindAsync(id);
            if (land == null) return NotFound(new { message = "Land record not found." });

            string apiKey = _configuration["ApiKeys:Gemini"];
            if (string.IsNullOrEmpty(apiKey)) return StatusCode(500, new { message = "Gemini API key is not configured." });

            string languageInstruction = "";
            if (!string.IsNullOrEmpty(lang))
            {
                var cleanLang = lang.Trim().ToLower();
                if (cleanLang.StartsWith("hi"))
                {
                    languageInstruction = "\nIMPORTANT: All values in the JSON fields (SoilSuitability, WaterAvailability, RainfallCompatibility, ExpectedProductivity, EstimatedProfitLoss) MUST be written in clean Hindi language (हिंदी).";
                }
                else if (cleanLang.StartsWith("mr"))
                {
                    languageInstruction = "\nIMPORTANT: All values in the JSON fields (SoilSuitability, WaterAvailability, RainfallCompatibility, ExpectedProductivity, EstimatedProfitLoss) MUST be written in clean Marathi language (मराठी).";
                }
            }

            string prompt = $@"You are an agricultural investment analyst. Analyze the investment viability of cultivating '{crop}' on land with:
- Soil Type: {land.SoilType}
- Groundwater Depth: {land.GroundwaterLevelDepth} meters

Return strictly a valid JSON object matching this schema exactly without markdown formatting:
{{
  ""SoilSuitability"": ""string"",
  ""WaterAvailability"": ""string"",
  ""RainfallCompatibility"": ""string"",
  ""ExpectedProductivity"": ""string"",
  ""EstimatedProfitLoss"": ""string""
}}{languageInstruction}";

            try
            {
                string model = _configuration["Gemini:Model"] ?? "gemini-3.6-flash";
                string url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                var requestBody = new
                {
                    contents = new[] { new { parts = new[] { new { text = prompt } } } },
                    generationConfig = new { responseMimeType = "application/json" }
                };

                var response = await _httpClient.PostAsJsonAsync(url, requestBody);
                if (!response.IsSuccessStatusCode) return StatusCode((int)response.StatusCode, new { message = "AI analysis request failed." });

                var jsonNode = await response.Content.ReadFromJsonAsync<JsonNode>();
                var jsonText = jsonNode?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.ToString();

                if (string.IsNullOrEmpty(jsonText)) return StatusCode(500, new { message = "Received empty analysis from AI." });

                jsonText = ExtractJson(jsonText);
                var extracted = JsonSerializer.Deserialize<JsonObject>(jsonText);

                if (userId.HasValue && extracted != null)
                {
                    try
                    {
                        var history = new UserSearchHistory
                        {
                            UserId = userId.Value,
                            SearchType = "Land Search",
                            Query = $"Land: {land.Title} ({land.Location}), Crop: {crop}",
                            ResultSummary = $"Suitability: {extracted["SoilSuitability"]}, Expected Productivity: {extracted["ExpectedProductivity"]}",
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.UserSearchHistories.Add(history);
                        await _context.SaveChangesAsync();
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine("Failed to save land analysis search history: " + ex.Message);
                    }
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

        private double CalculateDynamicIntelligenceScore(string soilType, double groundwaterDepth)
        {
            double score = 100.0; 
            score -= (groundwaterDepth * 0.3);

            if (!string.IsNullOrEmpty(soilType))
            {
                if (soilType.Contains("Alluvial", StringComparison.OrdinalIgnoreCase)) score += 15;
                else if (soilType.Contains("Black", StringComparison.OrdinalIgnoreCase)) score += 10;
                else if (soilType.Contains("Red", StringComparison.OrdinalIgnoreCase)) score += 5;
                else if (soilType.Contains("Sandy", StringComparison.OrdinalIgnoreCase)) score -= 10;
            }

            return Math.Round(Math.Clamp(score, 10.0, 98.0), 2);
        }

        private double CalculateDynamicBorewellProbability(string soilType, double groundwaterDepth)
        {
            double probability = 100.0;
            probability -= (groundwaterDepth * 0.45);

            if (!string.IsNullOrEmpty(soilType))
            {
                if (soilType.Contains("Basalt", StringComparison.OrdinalIgnoreCase) || soilType.Contains("Hard Rock", StringComparison.OrdinalIgnoreCase)) 
                    probability -= 20.0; 
                else if (soilType.Contains("Alluvial", StringComparison.OrdinalIgnoreCase)) 
                    probability += 10.0; 
            }

            return Math.Round(Math.Clamp(probability, 15.0, 95.0), 2);
        }
    }
}