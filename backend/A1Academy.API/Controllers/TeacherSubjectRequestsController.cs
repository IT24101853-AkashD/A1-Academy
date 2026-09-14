using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using A1Academy.API.Data;
using A1Academy.API.Data.Models;

namespace A1Academy.API.Controllers
{
    /// <summary>
    /// Admin's review queue for the "Other, please specify" subject a Teacher can type at
    /// registration when the one they want isn't in the Category list yet (see
    /// AuthController.Register, which creates these, and TeacherSubjectRequest for why this is
    /// kept separate from TeacherSubject). Nothing here is reachable by a Teacher - this is
    /// purely an Admin review tool, mirroring CategoriesController's own Admin-only writes.
    /// </summary>
    [Route("api/teacher-subject-requests")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class TeacherSubjectRequestsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TeacherSubjectRequestsController(AppDbContext context)
        {
            _context = context;
        }

        public class TeacherSubjectRequestSummary
        {
            public int Id { get; set; }
            public int TeacherId { get; set; }
            public string TeacherName { get; set; } = string.Empty;
            public string TeacherEmail { get; set; } = string.Empty;
            public string ProposedName { get; set; } = string.Empty;
            public string Status { get; set; } = string.Empty;
            public DateTime CreatedAt { get; set; }
        }

        // Defaults to Pending - the queue an Admin actually works from day to day. Passing
        // ?status=Approved or ?status=Rejected pulls up the already-decided ones instead, as a
        // record of what's been handled.
        [HttpGet]
        public async Task<ActionResult<List<TeacherSubjectRequestSummary>>> GetRequests([FromQuery] string status = "Pending")
        {
            if (!Enum.TryParse<TeacherSubjectRequestStatus>(status, true, out var statusFilter))
            {
                return BadRequest(new { message = "status must be Pending, Approved, or Rejected." });
            }

            var requests = await _context.TeacherSubjectRequests
                .Where(r => r.Status == statusFilter)
                .OrderBy(r => r.CreatedAt)
                .Select(r => new TeacherSubjectRequestSummary
                {
                    Id = r.Id,
                    TeacherId = r.TeacherId,
                    TeacherName = (r.Teacher!.FirstName + " " + (r.Teacher.LastName ?? string.Empty)).Trim(),
                    TeacherEmail = r.Teacher!.Email,
                    ProposedName = r.ProposedName,
                    Status = r.Status.ToString(),
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();

            return Ok(requests);
        }

        public class ApproveRequest
        {
            public int CategoryId { get; set; }
        }

        // The "assign the teacher to the subject" half of the workflow - the other half (add the
        // Category if the proposed subject is a real one worth offering) is just the existing
        // POST /api/categories, done first from CategoryManagementPage. This links the request's
        // Teacher to that already-existing Category id by creating the same TeacherSubject row
        // the ordinary registration-time checkbox path creates.
        [HttpPost("{id}/approve")]
        public async Task<IActionResult> Approve(int id, [FromBody] ApproveRequest request)
        {
            var subjectRequest = await _context.TeacherSubjectRequests.FindAsync(id);
            if (subjectRequest == null)
            {
                return NotFound(new { message = "Request not found." });
            }

            if (subjectRequest.Status != TeacherSubjectRequestStatus.Pending)
            {
                return Conflict(new { message = "This request has already been reviewed." });
            }

            var categoryExists = await _context.Categories.AnyAsync(c => c.Id == request.CategoryId);
            if (!categoryExists)
            {
                return BadRequest(new { message = "Select a category that exists - add it first if it doesn't yet." });
            }

            // Same unique-per-teacher-per-category rule the ordinary checkbox path enforces via
            // the database index (see AppDbContext) - a Teacher who separately picked this same
            // Category at registration, then also typed it as "Other", would otherwise hit that
            // index as an unhandled 500 here instead of this clean Conflict.
            var alreadyDeclared = await _context.TeacherSubjects
                .AnyAsync(ts => ts.TeacherId == subjectRequest.TeacherId && ts.CategoryId == request.CategoryId);
            if (alreadyDeclared)
            {
                return Conflict(new { message = "This teacher already has that subject." });
            }

            _context.TeacherSubjects.Add(new TeacherSubject { TeacherId = subjectRequest.TeacherId, CategoryId = request.CategoryId });
            subjectRequest.Status = TeacherSubjectRequestStatus.Approved;
            subjectRequest.ResultingCategoryId = request.CategoryId;
            subjectRequest.ReviewedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Approved. The teacher is now assigned to this subject." });
        }

        [HttpPost("{id}/reject")]
        public async Task<IActionResult> Reject(int id)
        {
            var subjectRequest = await _context.TeacherSubjectRequests.FindAsync(id);
            if (subjectRequest == null)
            {
                return NotFound(new { message = "Request not found." });
            }

            if (subjectRequest.Status != TeacherSubjectRequestStatus.Pending)
            {
                return Conflict(new { message = "This request has already been reviewed." });
            }

            subjectRequest.Status = TeacherSubjectRequestStatus.Rejected;
            subjectRequest.ReviewedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Request rejected." });
        }
    }
}
