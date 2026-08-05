using EarthScan.Backend.Data;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace EarthScan.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SupportQueriesController : ControllerBase
    {
        private readonly EarthScanDbContext _context;

        public SupportQueriesController(EarthScanDbContext context)
        {
            _context = context;
        }

        // GET: api/supportqueries
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SupportQuery>>> GetQueries()
        {
            return await _context.SupportQueries
                .OrderByDescending(q => q.CreatedAt)
                .ToListAsync();
        }

        // GET: api/supportqueries/byemail?email=user@example.com
        [HttpGet("byemail")]
        public async Task<ActionResult<IEnumerable<SupportQuery>>> GetQueriesByEmail([FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { message = "Email is required." });

            var queries = await _context.SupportQueries
                .Where(q => q.Email.ToLower() == email.ToLower())
                .OrderByDescending(q => q.CreatedAt)
                .ToListAsync();

            return Ok(queries);
        }

        // POST: api/supportqueries
        [HttpPost]
        public async Task<IActionResult> SubmitQuery([FromBody] ContactSupportRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name) || 
                string.IsNullOrWhiteSpace(request.Email) || 
                string.IsNullOrWhiteSpace(request.Message))
            {
                return BadRequest(new { message = "All fields are required." });
            }

            var query = new SupportQuery
            {
                Farmer = request.Name,
                Email = request.Email,
                Title = request.Message.Length > 40 ? request.Message.Substring(0, 37) + "..." : request.Message,
                Description = request.Message,
                Location = "Online Support",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            _context.SupportQueries.Add(query);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Support query submitted successfully.", query });
        }

        // PUT: api/supportqueries/{id}/reply
        [HttpPut("{id}/reply")]
        public async Task<IActionResult> ReplyQuery(int id, [FromBody] SupportQueryReplyRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Reply))
            {
                return BadRequest(new { message = "Reply content cannot be empty." });
            }

            var query = await _context.SupportQueries.FindAsync(id);
            if (query == null)
            {
                return NotFound(new { message = "Query not found." });
            }

            query.Answer = request.Reply;
            query.Status = "Answered";

            await _context.SaveChangesAsync();

            return Ok(new { message = "Reply submitted successfully.", query });
        }
    }

    public class ContactSupportRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }

    public class SupportQueryReplyRequest
    {
        public string Reply { get; set; } = string.Empty;
    }
}
