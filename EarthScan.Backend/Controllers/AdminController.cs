using System.Threading.Tasks;
using System.Linq;
using EarthScan.Backend.Data;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EarthScan.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly EarthScanDbContext _context;

        public AdminController(EarthScanDbContext context)
        {
            _context = context;
        }

        // GET: api/admin/users
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.Email,
                    u.Role
                })
                .ToListAsync();

            return Ok(users);
        }

        // DELETE: api/admin/users/5
        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            // Clean up forum posts and comments authored by this deleted user
            var userPosts = await _context.ForumPosts
                .Where(p => p.AuthorName == user.Name || p.AuthorName == user.Email)
                .ToListAsync();
            if (userPosts.Any())
            {
                _context.ForumPosts.RemoveRange(userPosts);
            }

            var userComments = await _context.ForumComments
                .Where(c => c.AuthorName == user.Name || c.AuthorName == user.Email)
                .ToListAsync();
            if (userComments.Any())
            {
                _context.ForumComments.RemoveRange(userComments);
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User deleted successfully" });
        }

        // PUT: api/admin/users/5
        [HttpPut("users/{id}")]
        public async Task<IActionResult> UpdateUserRole(int id, [FromBody] UserRoleUpdateRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Role))
            {
                return BadRequest(new { message = "Role cannot be empty" });
            }

            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            user.Role = request.Role;
            await _context.SaveChangesAsync();

            return Ok(new { message = "User role updated successfully" });
        }
    }

    public class UserRoleUpdateRequest
    {
        public string Role { get; set; } = string.Empty;
    }
}