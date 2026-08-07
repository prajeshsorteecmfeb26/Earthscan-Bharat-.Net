using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using EarthScan.Backend.Data;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using UglyToad.PdfPig;

namespace EarthScan.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SoilController : ControllerBase
    {
        private readonly EarthScanDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public SoilController(EarthScanDbContext context, IConfiguration configuration)
        {
            _context = context;
            _httpClient = new HttpClient();
            _configuration = configuration;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadSoilReport(IFormFile file, [FromQuery] int userId)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No soil report PDF file uploaded." });
            }

            // 1. Secure file validation
            var extension = System.IO.Path.GetExtension(file.FileName).ToLowerInvariant();
            if (extension != ".pdf")
            {
                return BadRequest(new { message = "Invalid file type. Only PDF reports are allowed." });
            }

            if (file.Length > 5 * 1024 * 1024)
            {
                return BadRequest(new { message = "Report file size exceeds the maximum limit of 5 MB." });
            }

            try
            {
                // 2. Read PDF text using PdfPig
                string pdfText = "";
                try
                {
                    using (var stream = file.OpenReadStream())
                    {
                        using (var pdf = PdfDocument.Open(stream))
                        {
                            foreach (var page in pdf.GetPages())
                            {
                                pdfText += page.Text + "\n";
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("PdfPig failed: " + ex.Message);
                }

                bool fallbackToDirectPdf = string.IsNullOrWhiteSpace(pdfText) || pdfText.Trim().Length < 50;

                // 3. Parse text to extract NPK / pH using Gemini API
                double n = 0, p = 0, k = 0, ph = 0;
                string soilType = "Black Soil";
                string soilHealthStatus = "Moderate soil health with standard NPK balance.";
                string nutrientDeficiency = "No severe deficiencies detected.";
                var suitableCropsList = new List<string> { "Cotton", "Soybean", "Wheat" };
                string fertilizerRecommendations = "Apply organic compost and balanced NPK (19:19:19) at regular sowing periods.";
                string waterManagementAdvice = "Provide sprinkler irrigation based on dry spells. Avoid waterlogging in low-lying sections.";
                string relevantGovernmentSchemes = "Soil Health Card Scheme, PM Krishi Sinchayee Yojana.";
                bool parsedViaAi = false;

                string apiKey = _configuration["ApiKeys:Gemini"] 
                    ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY") 
                    ?? string.Empty;

                if (!string.IsNullOrEmpty(apiKey) && apiKey != "YOUR_GEMINI_API_KEY_HERE" && apiKey.Length >= 20)
                {
                    try
                    {
                        string prompt = @"Analyze the Soil Health Card/Report PDF document.
Extract Nitrogen (N), Phosphorus (P), Potassium (K), and pH levels. Also generate customized recommendations based on these values.
Return strictly a valid JSON object matching this schema exactly without markdown formatting:
{
  ""Nitrogen"": 0.0,
  ""Phosphorus"": 0.0,
  ""Potassium"": 0.0,
  ""Ph"": 0.0,
  ""SoilType"": ""Black Cotton Soil"",
  ""SoilHealthStatus"": ""Brief overview of soil health status based on values"",
  ""NutrientDeficiency"": ""Detailed nutrient deficiency analysis (such as deficient elements)"",
  ""SuitableCrops"": [""Crop1"", ""Crop2"", ""Crop3""],
  ""FertilizerRecommendations"": ""Recommended fertilizer usage and application times"",
  ""WaterManagementAdvice"": ""Optimal irrigation tips (e.g. drip spacing, drainage guidance)"",
  ""RelevantGovernmentSchemes"": ""Government schemes relevant to these soil conditions (e.g. Micro-Irrigation subsidy, Soil Card benefits)""
}
If N/P/K is given in categories (low/medium/high), map: Low -> 30, Pattern/Medium -> 60, High -> 120.";

                        // Use configurable model version
                        string model = _configuration["Gemini:Model"] ?? "gemini-3.6-flash";
                        string url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                        
                        object requestBody;
                        if (fallbackToDirectPdf)
                        {
                            byte[] pdfBytes;
                            using (var memoryStream = new MemoryStream())
                            {
                                await file.CopyToAsync(memoryStream);
                                pdfBytes = memoryStream.ToArray();
                            }
                            string base64Pdf = Convert.ToBase64String(pdfBytes);

                            requestBody = new
                            {
                                contents = new[]
                                {
                                    new
                                    {
                                        parts = new object[]
                                        {
                                            new { text = prompt },
                                            new { inlineData = new { mimeType = "application/pdf", data = base64Pdf } }
                                        }
                                    }
                                },
                                generationConfig = new { responseMimeType = "application/json" }
                            };
                        }
                        else
                        {
                            requestBody = new
                            {
                                contents = new[]
                                {
                                    new
                                    {
                                        parts = new object[]
                                        {
                                            new { text = prompt + "\n\nExtracted Text:\n" + pdfText }
                                        }
                                    }
                                },
                                generationConfig = new { responseMimeType = "application/json" }
                            };
                        }

                        var response = await _httpClient.PostAsJsonAsync(url, requestBody);
                        if (response.IsSuccessStatusCode)
                        {
                            var jsonNode = await response.Content.ReadFromJsonAsync<JsonNode>();
                            var jsonText = jsonNode?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.ToString();
                            if (!string.IsNullOrEmpty(jsonText))
                            {
                                jsonText = ExtractJson(jsonText);
                                var extracted = JsonSerializer.Deserialize<JsonObject>(jsonText);
                                if (extracted != null)
                                {
                                    Func<string, double, double> getVal = (key, def) => {
                                        if (extracted.TryGetPropertyValue(key, out var node) && node != null) {
                                            try { return node.GetValue<double>(); }
                                            catch { if (double.TryParse(node.ToString(), out double v)) return v; }
                                        }
                                        if (extracted.TryGetPropertyValue(key.ToLower(), out var nodeLower) && nodeLower != null) {
                                            try { return nodeLower.GetValue<double>(); }
                                            catch { if (double.TryParse(nodeLower.ToString(), out double v)) return v; }
                                        }
                                        return def;
                                    };

                                    n = getVal("Nitrogen", 0);
                                    p = getVal("Phosphorus", 0);
                                    k = getVal("Potassium", 0);
                                    ph = getVal("Ph", 0);

                                    if (extracted.TryGetPropertyValue("SoilType", out var stNode) && stNode != null) soilType = stNode.ToString();
                                    else if (extracted.TryGetPropertyValue("soiltype", out var stNodeL) && stNodeL != null) soilType = stNodeL.ToString();

                                    if (extracted.TryGetPropertyValue("SoilHealthStatus", out var shsNode) && shsNode != null) soilHealthStatus = shsNode.ToString();
                                    if (extracted.TryGetPropertyValue("NutrientDeficiency", out var ndNode) && ndNode != null) nutrientDeficiency = ndNode.ToString();
                                    
                                    if (extracted.TryGetPropertyValue("SuitableCrops", out var scNode) && scNode != null)
                                    {
                                        try
                                        {
                                            var cropsArray = scNode.AsArray();
                                            suitableCropsList = cropsArray.Select(c => c?.ToString() ?? "").Where(s => !string.IsNullOrEmpty(s)).ToList();
                                        }
                                        catch {
                                            var strCrops = scNode.ToString();
                                            if (!string.IsNullOrEmpty(strCrops)) {
                                                suitableCropsList = strCrops.Split(',').Select(c => c.Trim()).ToList();
                                            }
                                        }
                                    }

                                    if (extracted.TryGetPropertyValue("FertilizerRecommendations", out var frNode) && frNode != null) fertilizerRecommendations = frNode.ToString();
                                    if (extracted.TryGetPropertyValue("WaterManagementAdvice", out var wmaNode) && wmaNode != null) waterManagementAdvice = wmaNode.ToString();
                                    if (extracted.TryGetPropertyValue("RelevantGovernmentSchemes", out var rgsNode) && rgsNode != null) relevantGovernmentSchemes = rgsNode.ToString();

                                    parsedViaAi = true;
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine("Gemini PDF parsing failed: " + ex.Message);
                    }
                }

                if (!parsedViaAi)
                {
                    // Fallback Regex
                    var phMatch = Regex.Match(pdfText, @"(?:ph|reaction)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)", RegexOptions.IgnoreCase);
                    if (phMatch.Success) double.TryParse(phMatch.Groups[1].Value, out ph);

                    var nMatch = Regex.Match(pdfText, @"(?:nitrogen|N)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)", RegexOptions.IgnoreCase);
                    if (nMatch.Success) double.TryParse(nMatch.Groups[1].Value, out n);

                    var pMatch = Regex.Match(pdfText, @"(?:phosphorus|phosphate|P)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)", RegexOptions.IgnoreCase);
                    if (pMatch.Success) double.TryParse(pMatch.Groups[1].Value, out p);

                    var kMatch = Regex.Match(pdfText, @"(?:potassium|potash|K)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)", RegexOptions.IgnoreCase);
                    if (kMatch.Success) double.TryParse(kMatch.Groups[1].Value, out k);

                    if (pdfText.ToLower().Contains("red")) soilType = "Red Soil";
                    else if (pdfText.ToLower().Contains("alluvial")) soilType = "Alluvial Soil";
                    else if (pdfText.ToLower().Contains("sandy")) soilType = "Sandy Loam Soil";

                    // Dynamically generate fallback recommendations based on parameters
                    if (ph > 0 && ph < 6.0)
                    {
                        soilHealthStatus = "Acidic soil health condition.";
                        nutrientDeficiency = "Lime conditioning needed. Phosphorus availability is restricted.";
                        suitableCropsList = new List<string> { "Rice", "Potato", "Tea" };
                        fertilizerRecommendations = "Apply Agricultural Lime (Calcium Carbonate) to raise pH. Limit acidic fertilizers like Ammonium Sulfate.";
                        waterManagementAdvice = "Ensure adequate watering but prevent stagnant acid build-up through active drainage.";
                    }
                    else if (ph > 8.0)
                    {
                        soilHealthStatus = "Alkaline soil health condition.";
                        nutrientDeficiency = "Zinc and Iron availability is critically low.";
                        suitableCropsList = new List<string> { "Wheat", "Cotton", "Barley" };
                        fertilizerRecommendations = "Apply Gypsum to reduce alkalinity. Use organic compost and sulfur-coated fertilizers.";
                        waterManagementAdvice = "Adopt drip irrigation to prevent sodium accumulation. Schedule deep leaching water runs.";
                    }
                    else
                    {
                        soilHealthStatus = "Optimal neutral soil pH.";
                        nutrientDeficiency = n < 50 ? "Low nitrogen levels." : "Balanced nutrient levels.";
                        suitableCropsList = new List<string> { "Cotton", "Soybean", "Gram" };
                        fertilizerRecommendations = n < 50 ? "Apply Urea (45% N) top-dressing during crop vegetative stage." : "Use standard NPK 19:19:19 balanced fertilizer.";
                        waterManagementAdvice = "Regular irrigation cycles. Black cotton soils require less frequent but deeper watering.";
                    }
                }

                // 4. Mark invalid/corrupted records if all values are missing/<=0
                bool isValid = true;
                if (n <= 0 && p <= 0 && k <= 0 && ph <= 0)
                {
                    isValid = false;
                }

                // 5. Default NPK values as fallback, do not overwrite parsed ones
                if (n <= 0) n = 140;
                if (p <= 0) p = 55;
                if (k <= 0) k = 85;
                if (ph <= 0) ph = 6.5;

                // 6. Save to SoilReports
                var report = new SoilReport
                {
                    UserId = userId,
                    FileName = file.FileName,
                    Nitrogen = n,
                    Phosphorus = p,
                    Potassium = k,
                    Ph = ph,
                    SoilType = soilType,
                    IsValid = isValid,
                    CreatedAt = DateTime.UtcNow
                };

                _context.SoilReports.Add(report);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = isValid ? "Soil report uploaded and parsed successfully." : "Soil report uploaded, but was marked invalid because no readable soil data was found.",
                    nitrogen = n,
                    phosphorus = p,
                    potassium = k,
                    ph = ph,
                    soilType = soilType,
                    isValid = isValid,
                    parsedViaAi = parsedViaAi,
                    soilHealthStatus = soilHealthStatus,
                    nutrientDeficiency = nutrientDeficiency,
                    suitableCrops = suitableCropsList,
                    fertilizerRecommendations = fertilizerRecommendations,
                    waterManagementAdvice = waterManagementAdvice,
                    relevantGovernmentSchemes = relevantGovernmentSchemes
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        public class RecommendationRequest
        {
            public double Nitrogen { get; set; }
            public double Phosphorus { get; set; }
            public double Potassium { get; set; }
            public double Ph { get; set; }
            public double Rainfall { get; set; }
        }

        [HttpPost("recommend")]
        public async Task<IActionResult> RecommendCrops([FromBody] RecommendationRequest request, [FromQuery] string? lang)
        {
            if (request == null) return BadRequest("Soil parameters are required.");

            string apiKey = _configuration["ApiKeys:Gemini"] 
                ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY") 
                ?? string.Empty;

            if (string.IsNullOrEmpty(apiKey) || apiKey == "YOUR_GEMINI_API_KEY_HERE" || apiKey.Length < 20)
            {
                return Ok(GetFallbackCropRecommendations(request, lang));
            }

            string languageInstruction = "";
            if (!string.IsNullOrEmpty(lang))
            {
                var cleanLang = lang.Trim().ToLower();
                if (cleanLang.StartsWith("hi"))
                {
                    languageInstruction = "\nIMPORTANT: All values in the JSON fields (crop, desc, fert, dose) MUST be written in clean Hindi language (हिंदी).";
                }
                else if (cleanLang.StartsWith("mr"))
                {
                    languageInstruction = "\nIMPORTANT: All values in the JSON fields (crop, desc, fert, dose) MUST be written in clean Marathi language (मराठी).";
                }
            }

            string prompt = $@"Analyze soil parameters for crop recommendation:
- Nitrogen (N): {request.Nitrogen} mg/kg
- Phosphorus (P): {request.Phosphorus} mg/kg
- Potassium (K): {request.Potassium} mg/kg
- pH Level: {request.Ph}
- Average Annual Rainfall: {request.Rainfall} mm

Recommend the top 2 suitable crops for cultivation. 
Return strictly a valid JSON array matching this schema exactly without markdown formatting:
[
  {{
    ""crop"": ""Crop Name"",
    ""match"": 95,
    ""type"": ""Recommended"",
    ""bg"": ""success"",
    ""desc"": ""detailed description why it is suitable..."",
    ""fert"": ""fertilizer recommendation..."",
    ""dose"": ""recommended dosage...""
  }},
  {{
    ""crop"": ""Alternative Crop Name"",
    ""match"": 82,
    ""type"": ""Alternative"",
    ""bg"": ""primary"",
    ""desc"": ""detailed description..."",
    ""fert"": ""fertilizer recommendation..."",
    ""dose"": ""recommended dosage...""
  }}
]{languageInstruction}";

            try
            {
                string model = _configuration["Gemini:Model"] ?? "gemini-1.5-flash";
                string url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                var requestBody = new
                {
                    contents = new[] { new { parts = new[] { new { text = prompt } } } },
                    generationConfig = new { responseMimeType = "application/json" }
                };

                var response = await _httpClient.PostAsJsonAsync(url, requestBody);
                if (!response.IsSuccessStatusCode)
                {
                    return Ok(GetFallbackCropRecommendations(request, lang));
                }

                var jsonNode = await response.Content.ReadFromJsonAsync<JsonNode>();
                var jsonText = jsonNode?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.ToString();
                
                if (string.IsNullOrEmpty(jsonText))
                {
                    return Ok(GetFallbackCropRecommendations(request, lang));
                }

                jsonText = ExtractJson(jsonText);
                var array = JsonSerializer.Deserialize<JsonArray>(jsonText);
                return Ok(array ?? (object)GetFallbackCropRecommendations(request, lang));
            }
            catch
            {
                return Ok(GetFallbackCropRecommendations(request, lang));
            }
        }

        private static object GetFallbackCropRecommendations(RecommendationRequest request, string? lang)
        {
            bool isHindi = !string.IsNullOrEmpty(lang) && lang.Trim().ToLower().StartsWith("hi");
            bool isMarathi = !string.IsNullOrEmpty(lang) && lang.Trim().ToLower().StartsWith("mr");

            double n = request.Nitrogen;
            double p = request.Phosphorus;
            double k = request.Potassium;
            double ph = request.Ph;
            double rain = request.Rainfall;

            string crop1, desc1, fert1, dose1;
            string crop2, desc2, fert2, dose2;

            int baseScore = (int)((n * 3 + p * 2 + k + ph * 10 + rain) % 11);
            int match1 = Math.Min(98, Math.Max(88, 92 + baseScore / 3));
            int match2 = Math.Min(match1 - 4, Math.Max(72, match1 - 8 - (int)(p % 5)));

            if (ph > 0 && ph < 6.0)
            {
                if (rain > 800)
                {
                    crop1 = isHindi ? "चावल (धान)" : (isMarathi ? "तांदूळ (भात)" : "Rice / Paddy");
                    desc1 = isHindi ? $"अम्लीय मिट्टी (pH {ph:F2}) और {rain} मिमी वर्षा के लिए आदर्श। उच्च जल भराव क्षमता।" : (isMarathi ? $"आम्लयुक्त माती (pH {ph:F2}) आणि {rain} मिमी पावसासाठी उत्तम." : $"Ideal for acidic soil (pH {ph:F2}) with high annual rainfall ({rain} mm).");
                    fert1 = isHindi ? "कृषि चूना + NPK 20:20:0" : (isMarathi ? "शेतीचा चुना + NPK 20:20:0" : "Agricultural Lime + NPK 20:20:0");
                    dose1 = isHindi ? "प्रति एकड़ 50 किग्रा चूना और 45 किग्रा NPK 20:20:0।" : (isMarathi ? "प्रति एकड ५० किलो चुना आणि ४५ किलो NPK 20:20:0." : "Apply 50 kg Lime & 45 kg NPK 20:20:0 per acre.");
                }
                else
                {
                    crop1 = isHindi ? "आलू" : (isMarathi ? "बटाटा" : "Potato");
                    desc1 = isHindi ? $"अम्लीय मिट्टी (pH {ph:F2}) और NPK स्तर (N:{n}, P:{p}, K:{k}) में कंद विकास अच्छा होता है।" : (isMarathi ? $"आम्लयुक्त मातीत (pH {ph:F2}) व NPK मध्ये बटाट्याची उत्तम वाढ होते." : $"Thrives in acidic soil (pH {ph:F2}) with NPK levels N:{n}, P:{p}, K:{k}.");
                    fert1 = isHindi ? "SSP (सिंगल सुपर फॉस्फेट) + MOP" : (isMarathi ? "SSP + MOP (म्युरिएट ऑफ पोटॅश)" : "SSP + MOP");
                    dose1 = isHindi ? "60 किग्रा SSP और 40 किग्रा MOP प्रति एकड़।" : (isMarathi ? "६० किलो SSP आणि ४० किलो MOP प्रति एकड." : "60 kg SSP & 40 kg MOP per acre.");
                }

                crop2 = isHindi ? "मक्का (कॉर्न)" : (isMarathi ? "मका" : "Maize (Corn)");
                desc2 = isHindi ? $"मध्यम अम्लीयता को सहन करता है (N: {n} mg/kg, K: {k} mg/kg)।" : (isMarathi ? $"मध्यम आम्लता सहन करते (N: {n} mg/kg, K: {k} mg/kg)." : $"Tolerates slight acidity with Nitrogen ({n} mg/kg) and Potassium ({k} mg/kg).");
                fert2 = isHindi ? "यूरिया और जिंक सल्फेट" : (isMarathi ? "युरिया आणि झिंक सल्फेट" : "Urea + Zinc Sulfate");
                dose2 = isHindi ? "50 किग्रा यूरिया प्रति एकड़।" : (isMarathi ? "५० किलो युरिया प्रति एकड." : "50 kg Urea per acre.");
            }
            else if (ph > 8.0)
            {
                crop1 = isHindi ? "गेहूं" : (isMarathi ? "गहू" : "Wheat");
                desc1 = isHindi ? $"क्षारीय मिट्टी (pH {ph:F2}) में उत्कृष्ट प्रदर्शन (P: {p}, K: {k})।" : (isMarathi ? $"क्षारयुक्त मातीत (pH {ph:F2}) उत्तम उत्पन्न (P: {p}, K: {k})." : $"Excellent performance in alkaline soil (pH {ph:F2}) with P:{p}, K:{k}.");
                fert1 = isHindi ? "जिप्सम + यूरिया" : (isMarathi ? "जिप्सम + युरिया" : "Gypsum + Urea");
                dose1 = isHindi ? "100 किग्रा जिप्सम और 45 किग्रा यूरिया प्रति एकड़।" : (isMarathi ? "१०० किलो जिप्सम आणि ४५ किलो युरिया प्रति एकड." : "100 kg Gypsum & 45 kg Urea per acre.");

                crop2 = isHindi ? "कपास" : (isMarathi ? "कापूस" : "Cotton");
                desc2 = isHindi ? $"गहरी काली/क्षारीय मिट्टी और {rain} मिमी वर्षा के अनुकूल।" : (isMarathi ? $"काळ्या क्षारयुक्त मातीसाठी आणि {rain} मिमी पावसासाठी योग्य." : $"Well adapted to alkaline soils with {rain} mm rainfall.");
                fert2 = isHindi ? "DAP + जिंक सल्फेट" : (isMarathi ? "DAP + झिंक सल्फेट" : "DAP + Zinc Sulfate");
                dose2 = isHindi ? "50 किग्रा DAP और 10 किग्रा जिंक सल्फेट प्रति एकड़।" : (isMarathi ? "५० किलो DAP आणि १० किलो झिंक सल्फेट प्रति एकड." : "50 kg DAP & 10 kg Zinc Sulfate per acre.");
            }
            else if (rain < 500)
            {
                crop1 = isHindi ? "बाजरा (मोटी फसल)" : (isMarathi ? "बाजरी" : "Pearl Millet (Bajra)");
                desc1 = isHindi ? $"कम वर्षा ({rain} मिमी) और तटस्थ pH ({ph:F2}) के लिए अत्यधिक उपयुक्त।" : (isMarathi ? $"कमी पावसात ({rain} मिमी) आणि तटस्थ pH ({ph:F2}) मध्ये उत्तम पीक." : $"Ideal for dry regions ({rain} mm rainfall) and neutral pH ({ph:F2}).");
                fert1 = isHindi ? "यूरिया + SSP" : (isMarathi ? "युरिया + SSP" : "Urea + SSP");
                dose1 = isHindi ? "30 किग्रा यूरिया और 40 किग्रा SSP प्रति एकड़।" : (isMarathi ? "३० किलो युरिया आणि ४० किलो SSP प्रति एकड." : "30 kg Urea & 40 kg SSP per acre.");

                crop2 = isHindi ? "चना (दलहन)" : (isMarathi ? "हरभरा" : "Chickpea / Gram");
                desc2 = isHindi ? $"कम पानी की मांग (N: {n} mg/kg)। मिट्टी में नाइट्रोजन स्थिर करता है।" : (isMarathi ? $"कमी पाण्याची गरज (N: {n} mg/kg). मातीचा सुपीकता वाढवतो." : $"Drought tolerant with N:{n} mg/kg. Fixes atmospheric nitrogen.");
                fert2 = isHindi ? "DAP + राइजोबियम" : (isMarathi ? "DAP + रायझोबियम" : "DAP + Rhizobium");
                dose2 = isHindi ? "40 किग्रा DAP प्रति एकड़।" : (isMarathi ? "४० किलो DAP प्रति एकड." : "40 kg DAP per acre.");
            }
            else if (n > 100)
            {
                crop1 = isHindi ? "मक्का (हाई-नाइट्रोजन)" : (isMarathi ? "हाय-नायट्रोजन मका" : "Maize / Sweet Corn");
                desc1 = isHindi ? $"उच्च नाइट्रोजन (N: {n} mg/kg) और संतुलित pH ({ph:F2}) का अधिकतम लाभ।" : (isMarathi ? $"भरपूर नायट्रोजन (N: {n} mg/kg) आणि pH ({ph:F2}) चा उत्तम फायदा." : $"Capitalizes on high Nitrogen (N: {n} mg/kg) and optimal pH ({ph:F2}).");
                fert1 = isHindi ? "NPK 19:19:19 + यूरिया" : (isMarathi ? "NPK 19:19:19 + युरिया" : "NPK 19:19:19 + Urea");
                dose1 = isHindi ? "50 किग्रा NPK 19:19:19 और 25 किग्रा यूरिया प्रति एकड़।" : (isMarathi ? "५० किलो NPK 19:19:19 आणि २५ किलो युरिया प्रति एकड." : "50 kg NPK 19:19:19 & 25 kg Urea per acre.");

                crop2 = isHindi ? "गन्ना" : (isMarathi ? "ऊस" : "Sugarcane");
                desc2 = isHindi ? $"उच्च NPK पोषक तत्वों (N:{n}, P:{p}, K:{k}) और पर्याप्त जल के लिए उपयुक्त।" : (isMarathi ? $"भरपूर पोषक घटकांसाठी (N:{n}, P:{p}, K:{k}) आणि पाण्यासाठी योग्य." : $"Demands high nutrients (N:{n}, P:{p}, K:{k}) and yields rich biomass.");
                fert2 = isHindi ? "यूरिया + MOP + एसएसपी" : (isMarathi ? "युरिया + MOP + SSP" : "Urea + MOP + SSP");
                dose2 = isHindi ? "100 किग्रा यूरिया और 50 किग्रा MOP प्रति एकड़।" : (isMarathi ? "१०० किलो युरिया आणि ५० किलो MOP प्रति एकड." : "100 kg Urea & 50 kg MOP per acre.");
            }
            else
            {
                crop1 = isHindi ? "सोयाबीन" : (isMarathi ? "सोयाबीन" : "Soybean");
                desc1 = isHindi ? $"संतुलित NPK (N:{n}, P:{p}, K:{k}) और pH {ph:F2} के लिए सर्वोत्तम दलहनी फसल।" : (isMarathi ? $"संतुलित NPK (N:{n}, P:{p}, K:{k}) आणि pH {ph:F2} साठी उत्तम पीक." : $"Optimal leguminous crop for NPK (N:{n}, P:{p}, K:{k}) and pH {ph:F2}.");
                fert1 = isHindi ? "NPK 12:32:16 + बायोफर्टिलाइजर" : (isMarathi ? "NPK 12:32:16 + जैव खत" : "NPK 12:32:16 + Biofertilizer");
                dose1 = isHindi ? "50 किग्रा NPK 12:32:16 प्रति एकड़ बुवाई के समय।" : (isMarathi ? "पेरणीवेळी ५० किलो NPK 12:32:16 प्रति एकड." : "50 kg NPK 12:32:16 per acre at sowing.");

                crop2 = isHindi ? "टमाटर / सब्जी" : (isMarathi ? "टोमॅटो" : "Tomato / Vegetables");
                desc2 = isHindi ? $"मध्यम वर्षा ({rain} मिमी) और pH {ph:F2} में अच्छी वृद्धि एवं फल उत्पादन।" : (isMarathi ? $"मध्यम पावसात ({rain} मिमी) आणि pH {ph:F2} मध्ये फळांची चांगली वाढ." : $"High value yield under {rain} mm rainfall and pH {ph:F2}.");
                fert2 = isHindi ? "19:19:19 + माइक्रो न्यूट्रिएंट स्प्रे" : (isMarathi ? "19:19:19 + सूक्ष्म अन्नद्रव्ये" : "NPK 19:19:19 + Micronutrients");
                dose2 = isHindi ? "40 किग्रा NPK 19:19:19 और 5 किग्रा जिंक सल्फेट।" : (isMarathi ? "४० किलो NPK 19:19:19 आणि ५ किलो झिंक." : "40 kg NPK 19:19:19 & 5 kg Micronutrients.");
            }

            return new[]
            {
                new
                {
                    crop = crop1,
                    match = match1,
                    type = "Recommended",
                    bg = "success",
                    desc = desc1,
                    fert = fert1,
                    dose = dose1
                },
                new
                {
                    crop = crop2,
                    match = match2,
                    type = "Alternative",
                    bg = "primary",
                    desc = desc2,
                    fert = fert2,
                    dose = dose2
                }
            };
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