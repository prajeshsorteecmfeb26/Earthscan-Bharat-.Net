using EarthScan.Backend.Data;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EarthScan.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Allow any logged-in user to access the forum
    public class ForumController : ControllerBase
    {
        private readonly EarthScanDbContext _context;

        public ForumController(EarthScanDbContext context)
        {
            _context = context;
        }

        // GET: api/forum/posts
        [HttpGet("posts")]
        public async Task<IActionResult> GetPosts()
        {
            // Auto-clean test/junk posts if present
            var junkPosts = await _context.ForumPosts
                .Where(p => p.Title == "ff" || p.Title == "I want my wage" || p.Content == "f" || p.Content == "wage")
                .ToListAsync();
            if (junkPosts.Any())
            {
                _context.ForumPosts.RemoveRange(junkPosts);
                await _context.SaveChangesAsync();
            }

            // Retrieve list of active user names and emails
            var activeUserNames = await _context.Users
                .Select(u => u.Name)
                .Union(_context.Users.Select(u => u.Email))
                .Where(n => !string.IsNullOrEmpty(n))
                .Distinct()
                .ToListAsync();

            var posts = await _context.ForumPosts
                .Where(p => activeUserNames.Contains(p.AuthorName) && p.Title != "ff" && p.Title != "I want my wage" && p.Content != "f" && p.Content != "wage")
                .Include(p => p.Comments)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Content,
                    p.AuthorName,
                    p.AuthorRole,
                    p.Category,
                    p.CreatedAt,
                    Comments = p.Comments
                        .Where(c => activeUserNames.Contains(c.AuthorName))
                        .OrderBy(c => c.CreatedAt)
                        .Select(c => new
                        {
                            c.Id,
                            c.Content,
                            c.AuthorName,
                            c.AuthorRole,
                            c.CreatedAt
                        })
                })
                .ToListAsync();

            return Ok(posts);
        }

        // DELETE: api/forum/posts/5
        [HttpDelete("posts/{id}")]
        public async Task<IActionResult> DeletePost(int id)
        {
            var post = await _context.ForumPosts.Include(p => p.Comments).FirstOrDefaultAsync(p => p.Id == id);
            if (post == null)
            {
                return NotFound(new { message = "Post not found" });
            }

            _context.ForumComments.RemoveRange(post.Comments);
            _context.ForumPosts.Remove(post);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Post deleted successfully" });
        }

        // POST: api/forum/posts
        [HttpPost("posts")]
        public async Task<IActionResult> CreatePost([FromBody] CreatePostRequest request)
        {
            var userName = User.FindFirstValue(ClaimTypes.Name) ?? "Unknown";
            var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "User";

            var post = new ForumPost
            {
                Title = request.Title,
                Content = request.Content,
                Category = request.Category,
                AuthorName = userName,
                AuthorRole = userRole,
                CreatedAt = DateTime.UtcNow
            };

            _context.ForumPosts.Add(post);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Post created successfully", post });
        }

        // POST: api/forum/posts/5/comments
        [HttpPost("posts/{postId}/comments")]
        public async Task<IActionResult> AddComment(int postId, [FromBody] CreateCommentRequest request)
        {
            var post = await _context.ForumPosts.FindAsync(postId);
            if (post == null)
            {
                return NotFound(new { message = "Post not found" });
            }

            var userName = User.FindFirstValue(ClaimTypes.Name) ?? "Unknown";
            var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "User";

            var comment = new ForumComment
            {
                ForumPostId = postId,
                Content = request.Content,
                AuthorName = userName,
                AuthorRole = userRole,
                CreatedAt = DateTime.UtcNow
            };

            _context.ForumComments.Add(comment);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Comment added successfully", comment });
        }
    }

    public class CreatePostRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
    }

    public class CreateCommentRequest
    {
        public string Content { get; set; } = string.Empty;
    }
}
