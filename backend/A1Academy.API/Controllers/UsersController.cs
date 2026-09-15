using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using A1Academy.API.Data;
using A1Academy.API.Services;
using AccountStatus = A1Academy.API.Data.Models.AccountStatus;

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

            // Match the query string against our known status values case-insensitively (so
            // ?status=pending and ?status=Pending behave the same), then filter on the exact
            // stored value. Anything that doesn't match one of ours - typos, empty string - is
            // just treated as "no filter" rather than a 400; this is a convenience filter, not
            // a strict API contract.
            var matchedStatus = new[] { AccountStatus.Pending, AccountStatus.Active, AccountStatus.Rejected, AccountStatus.Deactivated }
                .FirstOrDefault(known => string.Equals(known, status, StringComparison.OrdinalIgnoreCase));
            if (matchedStatus != null)
            {
                filtered = filtered.Where(u => u.AccountStatus == matchedStatus);
            }

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
                    Status = u.AccountStatus
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

        // Approves a Pending Teacher application. This is the "Teacher Approval" story - an
        // Admin looks at a Pending Teacher in the directory and hits Approve, and from then on
        // that teacher can log in and use the platform (AuthController's login blocks anyone
        // whose account isn't Active, so this is the other half of that gate).
        [HttpPatch("{id}/approve")]
        public Task<ActionResult<UserSummary>> ApproveTeacher(int id) =>
            ApplyTransitionAsync(id, AccountStatusTransitions.Approve);

        // Turns down a Pending Teacher application. Unlike deactivation this isn't meant to be
        // reversed later - if someone's rejected application should be reconsidered, that's a
        // fresh registration, not a status flip.
        [HttpPatch("{id}/reject")]
        public Task<ActionResult<UserSummary>> RejectTeacher(int id) =>
            ApplyTransitionAsync(id, AccountStatusTransitions.Reject);

        // Switches an Active account off. Works for any role, not just Teachers - a Student or
        // even an Admin account can be deactivated the same way.
        [HttpPatch("{id}/deactivate")]
        public Task<ActionResult<UserSummary>> DeactivateUser(int id) =>
            ApplyTransitionAsync(id, AccountStatusTransitions.Deactivate);

        // Switches a previously Deactivated account back on.
        [HttpPatch("{id}/reactivate")]
        public Task<ActionResult<UserSummary>> ReactivateUser(int id) =>
            ApplyTransitionAsync(id, AccountStatusTransitions.Reactivate);

        // Permanently removes a Student or Teacher account. Unlike Deactivate - which just
        // switches login off and is meant to be reversible via Reactivate - this deletes the row
        // outright, so there's nothing left to undo. Deliberately scoped to Student/Teacher only:
        // an Admin account is never a valid target here, whether it's someone else's (removing an
        // Admin is a decision this directory doesn't make unilaterally) or the caller's own
        // (already structurally impossible - nobody signed in as an Admin has Role "Student" or
        // "Teacher" on their own row, so no separate self-check is needed the way the status
        // transitions above require one). A Teacher's declared subjects and any pending "Other"
        // request are removed with them (see below) instead of being left orphaned.
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            if (user.Role != "Student" && user.Role != "Teacher")
            {
                return BadRequest(new { message = "Only Student and Teacher accounts can be deleted." });
            }

            // AppDbContext configures TeacherSubject/TeacherSubjectRequest to cascade on
            // TeacherId, but that only becomes a real database-level ON DELETE CASCADE on a
            // relational provider - EF Core's cascade delete otherwise only reaches entities
            // already tracked by this context. FindAsync above loaded just the User row, so
            // these have to be fetched and removed explicitly rather than left to the FK config.
            var teacherSubjects = await _context.TeacherSubjects.Where(ts => ts.TeacherId == id).ToListAsync();
            var teacherSubjectRequests = await _context.TeacherSubjectRequests.Where(r => r.TeacherId == id).ToListAsync();
            _context.TeacherSubjects.RemoveRange(teacherSubjects);
            _context.TeacherSubjectRequests.RemoveRange(teacherSubjectRequests);

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // Shared by all four actions above - looks up the account, asks the state machine
        // whether the move is legal from wherever the account currently is, and only touches
        // the database if it is. AccountStatusTransitions is what actually decides what's valid;
        // this method is just the HTTP plumbing around it (404/400/200).
        private async Task<ActionResult<UserSummary>> ApplyTransitionAsync(int id, string action)
        {
            // An Admin acting on their own account through this endpoint is never legitimate -
            // self-deactivation would lock them out mid-session (and, if they're the only Admin,
            // lock everyone else out of ever undoing it, since reactivation is itself
            // Admin-only). Checked before anything else, ahead of even the NotFound lookup below,
            // so it can't be bypassed by racing a deactivation against the account being deleted.
            var callerIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (callerIdClaim != null && int.TryParse(callerIdClaim, out var callerId) && callerId == id)
            {
                return BadRequest(new { message = "You cannot change your own account status. Ask another administrator to do this for you." });
            }

            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            if (!AccountStatusTransitions.TryApply(action, user.AccountStatus, out var resultingStatus, out var error))
            {
                return BadRequest(new { message = error });
            }

            user.AccountStatus = resultingStatus;

            // Rotating the security stamp is what actually terminates any session this account
            // already has open - see User.SecurityStampClaimType and Program.cs's
            // OnTokenValidated. Without this, a token issued before the transition (most
            // importantly, before a deactivate) would keep working until its own 7-day expiry
            // regardless of the account's new status.
            user.SecurityStamp = Guid.NewGuid().ToString("N");

            await _context.SaveChangesAsync();

            return Ok(new UserSummary
            {
                Id = user.Id,
                Name = (user.FirstName + " " + (user.LastName ?? string.Empty)).Trim(),
                Email = user.Email,
                Role = user.Role,
                Status = user.AccountStatus
            });
        }
    }
}
