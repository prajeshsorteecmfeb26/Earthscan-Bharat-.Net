using System;
using System.Collections;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using EarthScan.Backend.Controllers;
using EarthScan.Backend.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace EarthScan.CommunityService.Tests
{
    /// <summary>Unit tests for the community forum endpoints.</summary>
    public class ForumControllerTests
    {
        private static ForumController BuildController(EarthScan.Backend.Data.EarthScanDbContext context)
        {
            var identity = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Name, "Farmer User"),
                new Claim(ClaimTypes.Role, "Farmer")
            }, "TestAuth");

            return new ForumController(context)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
                }
            };
        }

        [Fact]
        public async Task GetPosts_ReturnsPostsNewestFirstWithComments()
        {
            using var context = TestSupport.CreateContext();

            var older = new ForumPost
            {
                Title = "Older post",
                Content = "First",
                AuthorName = "A",
                AuthorRole = "Farmer",
                Category = "General",
                CreatedAt = new DateTime(2026, 1, 1)
            };
            var newer = new ForumPost
            {
                Title = "Newer post",
                Content = "Second",
                AuthorName = "B",
                AuthorRole = "Farmer",
                Category = "General",
                CreatedAt = new DateTime(2026, 4, 1)
            };

            context.ForumPosts.AddRange(older, newer);
            await context.SaveChangesAsync();

            context.ForumComments.Add(new ForumComment
            {
                ForumPostId = newer.Id,
                Content = "Great advice",
                AuthorName = "C",
                AuthorRole = "Agriculture Expert",
                CreatedAt = new DateTime(2026, 4, 2)
            });
            await context.SaveChangesAsync();

            var controller = BuildController(context);

            var result = await controller.GetPosts();

            var ok = Assert.IsType<OkObjectResult>(result);
            var posts = Assert.IsAssignableFrom<IEnumerable>(ok.Value).Cast<object>().ToList();

            Assert.Equal(2, posts.Count);
            Assert.Equal("Newer post", TestSupport.ReadProperty(posts[0], "Title")?.ToString());

            var comments = Assert.IsAssignableFrom<IEnumerable>(TestSupport.ReadProperty(posts[0], "Comments"));
            Assert.Single(comments.Cast<object>());
        }

        [Fact]
        public async Task CreatePost_TakesAuthorFromTheJwtClaims()
        {
            using var context = TestSupport.CreateContext();
            var controller = BuildController(context);

            var result = await controller.CreatePost(new CreatePostRequest
            {
                Title = "Best time to sow soybean?",
                Content = "Looking for advice on Latur district.",
                Category = "Crops"
            });

            Assert.IsType<OkObjectResult>(result);

            var saved = context.ForumPosts.Single();
            Assert.Equal("Farmer User", saved.AuthorName);
            Assert.Equal("Farmer", saved.AuthorRole);
            Assert.Equal("Crops", saved.Category);
        }

        [Fact]
        public async Task AddComment_ReturnsNotFound_WhenPostMissing()
        {
            using var context = TestSupport.CreateContext();
            var controller = BuildController(context);

            var result = await controller.AddComment(4242, new CreateCommentRequest { Content = "Hello" });

            var notFound = Assert.IsType<NotFoundObjectResult>(result);
            Assert.Equal("Post not found", TestSupport.ReadMessage(notFound.Value));
        }

        [Fact]
        public async Task AddComment_AttachesTheCommentToThePost()
        {
            using var context = TestSupport.CreateContext();
            var post = new ForumPost
            {
                Title = "Question",
                Content = "Body",
                AuthorName = "A",
                AuthorRole = "Farmer",
                Category = "General"
            };
            context.ForumPosts.Add(post);
            await context.SaveChangesAsync();

            var controller = BuildController(context);

            var result = await controller.AddComment(post.Id, new CreateCommentRequest { Content = "Try drip irrigation" });

            Assert.IsType<OkObjectResult>(result);

            var comment = context.ForumComments.Single();
            Assert.Equal(post.Id, comment.ForumPostId);
            Assert.Equal("Try drip irrigation", comment.Content);
            Assert.Equal("Farmer User", comment.AuthorName);
        }
    }
}
