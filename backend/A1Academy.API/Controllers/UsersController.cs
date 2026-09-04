using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using A1Academy.API.Data;

namespace A1Academy.API.Controllers
{
    /// <summary>
    /// Administrator-only user directory. [Authorize(Roles = "Admin")] is the real access
    /// control here - it's enforced by the ASP.NET Core authorization middleware against the
    /// "Admin" role claim on the caller's JWT, so a Student or Teacher gets 403 Forbidden even
    /// if they call this endpoint directly (no UI involved). Hiding the nav link on the frontend
    /// is a UX nicety on top of this, never a substitute for it.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        public class UserSummary
        {
            public string Name { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Role { get; set; } = string.Empty;
            public string Status { get; set; } = string.Empty;
        }

        public class PagedUsersResponse
        {
            public List<UserSummary> Items { get; set; } = new();
            public int Page { get; set; }
            public int PageSize { get; set; }
            public int TotalCount { get; set; }
            public int TotalPages { get; set; }
        }

        private const int DefaultPageSize = 10;
        private const int MaxPageSize = 100;

        [HttpGet]
        public async Task<ActionResult<PagedUsersResponse>> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = DefaultPageSize)
        {
            // Clamp rather than reject bad/out-of-range paging input - an admin bookmarking
            // ?page=0 or a stale link from a shrunk dataset should just land on something
            // sensible instead of erroring.
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

            // Projected directly into UserSummary in the query (never materializing the full
            // User entity here) so password hashes, OTP cache keys, etc. can't leak into the
            // response even by accident.
            var query = _context.Users
                .OrderBy(u => u.FirstName)
                .ThenBy(u => u.LastName)
                .Select(u => new UserSummary
                {
                    Name = (u.FirstName + " " + (u.LastName ?? string.Empty)).Trim(),
                    Email = u.Email,
                    Role = u.Role,
                    Status = (u.Role == "Teacher" && !u.IsApproved) ? "Pending" : "Active"
                });

            var totalCount = await query.CountAsync();
            var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize);

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new PagedUsersResponse
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages
            });
        }
    }
}
