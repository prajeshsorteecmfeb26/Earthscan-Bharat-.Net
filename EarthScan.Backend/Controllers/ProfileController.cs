using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EarthScan.Backend.Data;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EarthScan.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProfileController : ControllerBase
    {
        private readonly EarthScanDbContext _context;

        public ProfileController(EarthScanDbContext context)
        {
            _context = context;
        }

        // GET: api/profile/{userId}
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetProfile(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            return Ok(new
            {
                user.Id,
                user.Name,
                user.Email,
                user.Role,
                user.Phone,
                user.Location,
                user.FarmingInformation,
                user.ProfilePicturePath,
                user.Pincode,
                user.Village,
                user.Taluka,
                user.District,
                user.StateName,
                user.Latitude,
                user.Longitude
            });
        }

        // PUT: api/profile
        [HttpPut]
        public async Task<IActionResult> UpdateProfile([FromBody] User profileData)
        {
            if (profileData == null)
            {
                return BadRequest("Invalid profile data.");
            }

            var user = await _context.Users.FindAsync(profileData.Id);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            user.Name = profileData.Name;
            user.Phone = profileData.Phone;
            user.Location = profileData.Location;
            user.FarmingInformation = profileData.FarmingInformation;
            user.Pincode = profileData.Pincode;
            user.Village = profileData.Village;
            user.Taluka = profileData.Taluka;
            user.District = profileData.District;
            user.StateName = profileData.StateName;
            user.Latitude = profileData.Latitude;
            user.Longitude = profileData.Longitude;
            
            // Allow role change (Farmer <-> Land Buyer)
            if (profileData.Role == "Farmer" || profileData.Role == "Land Buyer")
            {
                user.Role = profileData.Role;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Profile updated successfully.",
                user = new
                {
                    user.Id,
                    user.Name,
                    user.Email,
                    user.Role,
                    user.Phone,
                    user.Location,
                    user.FarmingInformation,
                    user.ProfilePicturePath,
                    user.Pincode,
                    user.Village,
                    user.Taluka,
                    user.District,
                    user.StateName,
                    user.Latitude,
                    user.Longitude
                }
            });
        }

        // POST: api/profile/upload-photo
        [HttpPost("upload-photo")]
        public async Task<IActionResult> UploadPhoto([FromForm] IFormFile photo, [FromForm] int userId)
        {
            if (photo == null || photo.Length == 0)
            {
                return BadRequest("No photo uploaded.");
            }

            // 1. Validate file extension securely
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            var extension = System.IO.Path.GetExtension(photo.FileName).ToLowerInvariant();
            if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
            {
                return BadRequest("Invalid file type. Only JPG, JPEG, PNG, and WEBP images are allowed.");
            }

            // 2. Validate file size (max 5 MB)
            if (photo.Length > 5 * 1024 * 1024)
            {
                return BadRequest("Image size exceeds the maximum limit of 5 MB.");
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            try
            {
                var uploadsFolder = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot", "uploads", "profiles");
                if (!System.IO.Directory.Exists(uploadsFolder))
                {
                    System.IO.Directory.CreateDirectory(uploadsFolder);
                }

                // 3. Generate secure random filename
                var uniqueFileName = $"{Guid.NewGuid()}{extension}";
                var filePath = System.IO.Path.Combine(uploadsFolder, uniqueFileName);

                using (var stream = new System.IO.FileStream(filePath, System.IO.FileMode.Create))
                {
                    await photo.CopyToAsync(stream);
                }

                user.ProfilePicturePath = $"/uploads/profiles/{uniqueFileName}";
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Profile picture uploaded successfully.",
                    profilePicturePath = user.ProfilePicturePath,
                    user = new
                    {
                        user.Id,
                        user.Name,
                        user.Email,
                        user.Role,
                        user.Phone,
                        user.Location,
                        user.FarmingInformation,
                        user.ProfilePicturePath
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // GET: api/profile/history/{userId}
        [HttpGet("history/{userId}")]
        public async Task<IActionResult> GetHistory(int userId)
        {
            // 1. Gather custom search histories (Borewell planner, land searches)
            var searches = await _context.UserSearchHistories
                .Where(h => h.UserId == userId)
                .Select(h => new
                {
                    Id = h.Id.ToString(),
                    Type = "Search",
                    Category = h.SearchType,
                    Title = h.Query,
                    Description = h.ResultSummary,
                    Date = h.CreatedAt
                })
                .ToListAsync();

            // 2. Gather crop disease checks
            var diseases = await _context.DiseasePredictions
                .Where(d => d.UserId == userId)
                .Select(d => new
                {
                    Id = "disease_" + d.Id,
                    Type = "Disease",
                    Category = "Crop Analyzer",
                    Title = d.ImagePath,
                    Description = $"Detected: {d.DiseaseName} ({d.Confidence}% Confidence)",
                    Date = d.CreatedAt
                })
                .ToListAsync();

            // 3. Gather uploaded soil reports
            var soilReports = await _context.SoilReports
                .Where(s => s.UserId == userId && s.IsValid == true)
                .Select(s => new
                {
                    Id = "soil_" + s.Id,
                    Type = "Soil",
                    Category = "Soil Health Card",
                    Title = s.FileName,
                    Description = $"Analyzed Soil: {s.SoilType} (pH: {s.Ph}, N: {s.Nitrogen}, P: {s.Phosphorus}, K: {s.Potassium})",
                    Date = s.CreatedAt
                })
                .ToListAsync();

            // 4. Gather chat queries
            var chats = await _context.AIChatHistories
                .Where(c => c.UserId == userId)
                .Select(c => new
                {
                    Id = "chat_" + c.Id,
                    Type = "Chat",
                    Category = "Krishi Mitra Advisory",
                    Title = c.Question,
                    Description = c.Answer.Length > 150 ? c.Answer.Substring(0, 150) + "..." : c.Answer,
                    Date = c.CreatedAt
                })
                .ToListAsync();

            // Merge and sort by date descending
            var allHistory = searches
                .Concat(diseases)
                .Concat(soilReports)
                .Concat(chats)
                .OrderByDescending(h => h.Date)
                .ToList();

            return Ok(allHistory);
        }
    }
}
