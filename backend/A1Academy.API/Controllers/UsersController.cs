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

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserSummary>>> GetUsers()
        {
            // Projected directly into UserSummary in the query (never materializing the full
            // User entity here) so password hashes, OTP cache keys, etc. can't leak into the
            // response even by accident.
            var users = await _context.Users
                .OrderBy(u => u.FirstName)
                .ThenBy(u => u.LastName)
                .Select(u => new UserSummary
                {
                    Name = (u.FirstName + " " + (u.LastName ?? string.Empty)).Trim(),
                    Email = u.Email,
                    Role = u.Role,
                    Status = (u.Role == "Teacher" && !u.IsApproved) ? "Pending" : "Active"
                })
                .ToListAsync();

            return Ok(users);
        }
    }
}
