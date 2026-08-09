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

            var posts = await _context.ForumPosts
                .Where(p => p.Title != "ff" && p.Title != "I want my wage" && p.Content != "f" && p.Content != "wage")
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

        // POST: api/forum/posts
        [HttpPost("posts")]
        public async Task<IActionResult> CreatePost([FromBody] CreatePostRequest request)
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

            var userName = currentUser?.Name 
                        ?? User.FindFirstValue(ClaimTypes.Name) 
                        ?? User.FindFirstValue("unique_name") 
                        ?? User.FindFirstValue("name") 
                        ?? User.Identity?.Name 
                        ?? "Farmer User";

            var userRole = currentUser?.Role 
                        ?? User.FindFirstValue(ClaimTypes.Role) 
                        ?? User.FindFirstValue("role") 
                        ?? "Farmer";

            var post = new ForumPost
            {
                Title = request.Title,
                Content = request.Content,
                Category = string.IsNullOrWhiteSpace(request.Category) ? "General" : request.Category,
                AuthorName = userName,
                AuthorRole = userRole,
                CreatedAt = DateTime.UtcNow
            };

            _context.ForumPosts.Add(post);
            await _context.SaveChangesAsync();

            var responsePost = new
            {
                post.Id,
                post.Title,
                post.Content,
                post.AuthorName,
                post.AuthorRole,
                post.Category,
                post.CreatedAt,
                Comments = Array.Empty<object>()
            };

            return Ok(new { message = "Post created successfully", post = responsePost });
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

            var userName = currentUser?.Name 
                        ?? User.FindFirstValue(ClaimTypes.Name) 
                        ?? User.FindFirstValue("unique_name") 
                        ?? User.FindFirstValue("name") 
                        ?? User.Identity?.Name;

            var userRole = currentUser?.Role 
                        ?? User.FindFirstValue(ClaimTypes.Role) 
                        ?? User.FindFirstValue("role") 
                        ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("role", StringComparison.OrdinalIgnoreCase))?.Value
                        ?? "Farmer";

            bool isExpertOrAdmin = string.Equals(userRole, "Agriculture Expert", StringComparison.OrdinalIgnoreCase)
                                || string.Equals(userRole, "Admin", StringComparison.OrdinalIgnoreCase)
                                || userRole.ToLower().Contains("expert")
                                || User.IsInRole("Agriculture Expert")
                                || User.IsInRole("Admin");

            bool isPostAuthor = !string.IsNullOrEmpty(userName) && string.Equals(post.AuthorName, userName, StringComparison.OrdinalIgnoreCase);

            if (!isExpertOrAdmin && !isPostAuthor)
            {
                return StatusCode(403, new { message = "You can only delete your own posts." });
            }

            if (post.Comments != null && post.Comments.Any())
            {
                _context.ForumComments.RemoveRange(post.Comments);
            }

            _context.ForumPosts.Remove(post);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Post deleted successfully" });
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

            var userName = currentUser?.Name 
                        ?? User.FindFirstValue(ClaimTypes.Name) 
                        ?? User.FindFirstValue("unique_name") 
                        ?? User.FindFirstValue("name") 
                        ?? User.Identity?.Name 
                        ?? "Farmer User";

            var userRole = currentUser?.Role 
                        ?? User.FindFirstValue(ClaimTypes.Role) 
                        ?? User.FindFirstValue("role") 
                        ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("role", StringComparison.OrdinalIgnoreCase))?.Value
                        ?? "Farmer";

            bool isAllowedToComment = string.Equals(userRole, "Agriculture Expert", StringComparison.OrdinalIgnoreCase)
                                   || string.Equals(userRole, "Admin", StringComparison.OrdinalIgnoreCase)
                                   || userRole.ToLower().Contains("expert")
                                   || User.IsInRole("Agriculture Expert")
                                   || User.IsInRole("Admin");

            if (!isAllowedToComment)
            {
                return StatusCode(403, new { message = "Only Agriculture Experts are allowed to add comments or replies to forum posts." });
            }

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

        // PUT: api/forum/comments/5
        [HttpPut("comments/{commentId}")]
        public async Task<IActionResult> UpdateComment(int commentId, [FromBody] UpdateCommentRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Content))
            {
                return BadRequest(new { message = "Comment content cannot be empty." });
            }

            var comment = await _context.ForumComments.FindAsync(commentId);
            if (comment == null)
            {
                return NotFound(new { message = "Comment not found" });
            }

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

            var userName = currentUser?.Name 
                        ?? User.FindFirstValue(ClaimTypes.Name) 
                        ?? User.FindFirstValue("unique_name") 
                        ?? User.FindFirstValue("name") 
                        ?? User.Identity?.Name;

            var userRole = currentUser?.Role 
                        ?? User.FindFirstValue(ClaimTypes.Role) 
                        ?? User.FindFirstValue("role") 
                        ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("role", StringComparison.OrdinalIgnoreCase))?.Value
                        ?? "Farmer";

            bool isExpertOrAdmin = string.Equals(userRole, "Agriculture Expert", StringComparison.OrdinalIgnoreCase)
                                || string.Equals(userRole, "Admin", StringComparison.OrdinalIgnoreCase)
                                || userRole.ToLower().Contains("expert")
                                || User.IsInRole("Agriculture Expert")
                                || User.IsInRole("Admin");

            bool isAuthor = !string.IsNullOrEmpty(userName) && string.Equals(comment.AuthorName, userName, StringComparison.OrdinalIgnoreCase);

            if (!isExpertOrAdmin && !isAuthor)
            {
                return StatusCode(403, new { message = "You can only edit your own comments." });
            }

            comment.Content = request.Content;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Comment updated successfully", comment });
        }

        // DELETE: api/forum/comments/5
        [HttpDelete("comments/{commentId}")]
        public async Task<IActionResult> DeleteComment(int commentId)
        {
            var comment = await _context.ForumComments.FindAsync(commentId);
            if (comment == null)
            {
                return NotFound(new { message = "Comment not found" });
            }

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

            var userName = currentUser?.Name 
                        ?? User.FindFirstValue(ClaimTypes.Name) 
                        ?? User.FindFirstValue("unique_name") 
                        ?? User.FindFirstValue("name") 
                        ?? User.Identity?.Name;

            var userRole = currentUser?.Role 
                        ?? User.FindFirstValue(ClaimTypes.Role) 
                        ?? User.FindFirstValue("role") 
                        ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("role", StringComparison.OrdinalIgnoreCase))?.Value
                        ?? "Farmer";

            bool isExpertOrAdmin = string.Equals(userRole, "Agriculture Expert", StringComparison.OrdinalIgnoreCase)
                                || string.Equals(userRole, "Admin", StringComparison.OrdinalIgnoreCase)
                                || userRole.ToLower().Contains("expert")
                                || User.IsInRole("Agriculture Expert")
                                || User.IsInRole("Admin");

            bool isAuthor = !string.IsNullOrEmpty(userName) && string.Equals(comment.AuthorName, userName, StringComparison.OrdinalIgnoreCase);

            if (!isExpertOrAdmin && !isAuthor)
            {
                return StatusCode(403, new { message = "You can only delete your own comments." });
            }

            _context.ForumComments.Remove(comment);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Comment deleted successfully" });
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

    public class UpdateCommentRequest
    {
        public string Content { get; set; } = string.Empty;
    }
}
