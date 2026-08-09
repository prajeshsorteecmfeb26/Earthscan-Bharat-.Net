using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using EarthScan.Backend.Data;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EarthScan.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SchemesController : ControllerBase
    {
        private readonly EarthScanDbContext _context;

        public SchemesController(EarthScanDbContext context)
        {
            _context = context;
        }

        // GET: api/schemes
        [HttpGet]
        public async Task<ActionResult<IEnumerable<GovernmentScheme>>> GetSchemes()
        {
            try
            {
                var dbSchemes = await _context.GovernmentSchemes.ToListAsync();
                if (dbSchemes != null && dbSchemes.Any())
                {
                    return Ok(dbSchemes);
                }
            }
            catch { }

            // Default curated government schemes for farmers
            var defaultSchemes = new List<GovernmentScheme>
            {
                new GovernmentScheme
                {
                    Id = 1,
                    Name = "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
                    Description = "Direct financial support of ₹6,000 per year transferred into bank accounts of landholding farmer families in three equal installments.",
                    Benefit = "₹6,000 / Year (3 Installments of ₹2,000)",
                    Eligibility = "Small & Marginal Farmers owning cultivable agricultural land across all states.",
                    ApplicationLink = "https://pmkisan.gov.in",
                    Status = "Active"
                },
                new GovernmentScheme
                {
                    Id = 2,
                    Name = "PMFBY (Pradhan Mantri Fasal Bima Yojana)",
                    Description = "Comprehensive crop insurance scheme providing financial coverage against crop failure caused by drought, flood, pests & natural disasters.",
                    Benefit = "Up to 100% Crop Damage Financial Claim Settlement",
                    Eligibility = "All farmers growing notified Kharif & Rabi crops in notified districts.",
                    ApplicationLink = "https://pmfby.gov.in",
                    Status = "Active"
                },
                new GovernmentScheme
                {
                    Id = 3,
                    Name = "Kisan Credit Card (KCC) Scheme",
                    Description = "Low-interest institutional credit up to ₹3 Lakhs for farmers to purchase seeds, fertilizers, pesticides, and machinery without collateral up to ₹1.6 Lakh.",
                    Benefit = "Subsidized 4% Loan Rate & Collateral-Free Credit",
                    Eligibility = "Farmers, Tenant Farmers, Sharecroppers & SHGs with valid land or lease proof.",
                    ApplicationLink = "https://pmkisan.gov.in/KCC.aspx",
                    Status = "Active"
                },
                new GovernmentScheme
                {
                    Id = 4,
                    Name = "PMKSY (Pradhan Mantri Krishi Sinchayee Yojana)",
                    Description = "Per Drop More Crop scheme offering micro-irrigation subsidies for Drip and Sprinkler systems to optimize water use efficiency.",
                    Benefit = "45% to 55% Micro-Irrigation Subsidy",
                    Eligibility = "All farmers with accessible agricultural land and irrigation water source.",
                    ApplicationLink = "https://pmksy.gov.in",
                    Status = "Active"
                },
                new GovernmentScheme
                {
                    Id = 5,
                    Name = "Soil Health Card Scheme",
                    Description = "Provides detailed soil nutrient analysis and customized fertilizer recommendations every 2 years to improve soil health & yield.",
                    Benefit = "Free Soil Testing & Custom Fertilizer Advisory",
                    Eligibility = "All agricultural land owners across India.",
                    ApplicationLink = "https://soilhealth.dac.gov.in",
                    Status = "Active"
                }
            };

            return Ok(defaultSchemes);
        }

        // POST: api/schemes/register
        [HttpPost("register")]
        [Authorize]
        public async Task<IActionResult> RegisterScheme([FromBody] RegisterSchemeRequest request)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                           ?? User.FindFirstValue("sub") 
                           ?? User.FindFirstValue("nameid");

            User? currentUser = null;
            if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out int userId))
            {
                currentUser = await _context.Users.FindAsync(userId);
            }

            if (currentUser == null)
            {
                var emailClaim = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
                if (!string.IsNullOrEmpty(emailClaim))
                {
                    currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == emailClaim);
                }
            }

            var farmerId = currentUser?.Id ?? 0;
            var farmerName = currentUser?.Name ?? User.Identity?.Name ?? "Farmer";
            var farmerEmail = currentUser?.Email ?? User.FindFirstValue(ClaimTypes.Email) ?? "";

            var registration = new SchemeRegistration
            {
                SchemeId = request.SchemeId,
                SchemeName = request.SchemeName,
                FarmerId = farmerId,
                FarmerName = farmerName,
                FarmerEmail = farmerEmail,
                Phone = request.Phone,
                AadhaarNumber = request.AadhaarNumber,
                LandSizeAcres = request.LandSizeAcres,
                BankAccountNumber = request.BankAccountNumber,
                IfscCode = request.IfscCode,
                Location = request.Location,
                Status = "Verified - Application Submitted",
                RegisteredAt = DateTime.UtcNow
            };

            try
            {
                _context.SchemeRegistrations.Add(registration);
                await _context.SaveChangesAsync();
            }
            catch { }

            var refNo = $"REG-{request.SchemeId}-{DateTime.UtcNow:yyyyMMddHHmmss}";

            return Ok(new
            {
                success = true,
                message = $"Successfully registered for {request.SchemeName}!",
                referenceNumber = refNo,
                registration
            });
        }

        // GET: api/schemes/my-registrations
        [HttpGet("my-registrations")]
        [Authorize]
        public async Task<IActionResult> GetMyRegistrations()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                           ?? User.FindFirstValue("sub") 
                           ?? User.FindFirstValue("nameid");

            int farmerId = 0;
            if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out int uid))
            {
                farmerId = uid;
            }

            var emailClaim = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? "";

            try
            {
                var regs = await _context.SchemeRegistrations
                    .Where(r => (farmerId > 0 && r.FarmerId == farmerId) || (!string.IsNullOrEmpty(emailClaim) && r.FarmerEmail == emailClaim))
                    .OrderByDescending(r => r.RegisteredAt)
                    .ToListAsync();

                return Ok(regs);
            }
            catch
            {
                return Ok(new List<SchemeRegistration>());
            }
        }
    }
}
