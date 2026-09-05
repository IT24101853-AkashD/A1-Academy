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
            // Needed so the frontend has something to target when approving a specific teacher -
            // email would technically work too since it's unique, but the primary key is the
            // obvious choice for an update/approve action.
            public int Id { get; set; }
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
        public async Task<ActionResult<PagedUsersResponse>> GetUsers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = DefaultPageSize,
            [FromQuery] string? role = null,
            [FromQuery] string? status = null)
        {
            // Clamp rather than reject bad/out-of-range paging input - an admin bookmarking
            // ?page=0 or a stale link from a shrunk dataset should just land on something
            // sensible instead of erroring.
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

            IQueryable<Data.Models.User> filtered = _context.Users;

            if (!string.IsNullOrWhiteSpace(role))
            {
                filtered = filtered.Where(u => u.Role == role);
            }

            // "Status" isn't a stored column - it's derived from Role + IsApproved (see the
            // projection below), so filtering on it has to express the same rule as a Where
            // clause. Keep the two in sync if that derivation ever changes.
            if (string.Equals(status, "Pending", StringComparison.OrdinalIgnoreCase))
            {
                filtered = filtered.Where(u => u.Role == "Teacher" && !u.IsApproved);
            }
            else if (string.Equals(status, "Active", StringComparison.OrdinalIgnoreCase))
            {
                filtered = filtered.Where(u => !(u.Role == "Teacher" && !u.IsApproved));
            }
            // Any other/empty status value is treated as "no filter" rather than an error.

            // Projected directly into UserSummary in the query (never materializing the full
            // User entity here) so password hashes, OTP cache keys, etc. can't leak into the
            // response even by accident.
            var query = filtered
                .OrderBy(u => u.FirstName)
                .ThenBy(u => u.LastName)
                .Select(u => new UserSummary
                {
                    Id = u.Id,
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

        // Flips a Pending Teacher to Active. This is the whole "Teacher Approval" story - an
        // Admin looks at a Pending Teacher in the directory and hits Approve, and from then on
        // that teacher can log in and use the platform (AuthController's login already blocks
        // unapproved teachers, so this is the other half of that gate).
        [HttpPatch("{id}/approve")]
        public async Task<ActionResult<UserSummary>> ApproveTeacher(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            if (user.Role != "Teacher")
            {
                // Approval only makes sense for teacher accounts - students and admins don't
                // have a pending state, so trying to approve one is a client error, not a 404.
                return BadRequest(new { message = "Only Teacher accounts can be approved." });
            }

            // Already approved? Don't error, just treat it as a no-op - an admin double-clicking
            // Approve (or a stale page reloaded twice) shouldn't blow up.
            if (!user.IsApproved)
            {
                user.IsApproved = true;
                await _context.SaveChangesAsync();
            }

            return Ok(new UserSummary
            {
                Id = user.Id,
                Name = (user.FirstName + " " + (user.LastName ?? string.Empty)).Trim(),
                Email = user.Email,
                Role = user.Role,
                Status = "Active"
            });
        }
    }
}
