using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;

namespace A1Academy.TeacherService.Controllers
{
    /// <summary>
    /// Lets a Teacher create an assignment (with a strict deadline) for a class they own, and see
    /// how many Students have submitted so far. Submitting itself is a Student action - see
    /// StudentService's AssignmentsController.
    /// </summary>
    [Route("api/teacher/classes/{classId}/assignments")]
    [ApiController]
    [Authorize(Roles = "Teacher")]
    public class AssignmentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AssignmentsController(AppDbContext context)
        {
            _context = context;
        }

        public class AssignmentSummary
        {
            public int Id { get; set; }
            public string Title { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public DateTime DueAt { get; set; }
            public int SubmissionCount { get; set; }
        }

        public class CreateAssignmentRequest
        {
            public string Title { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
            public DateTime DueAt { get; set; }
        }

        private int? CurrentTeacherId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claim, out var id) ? id : null;
        }

        private async Task<bool> OwnsClassAsync(int classId, int teacherId) =>
            await _context.Classes.AnyAsync(c => c.Id == classId && c.TeacherId == teacherId);

        [HttpGet]
        public async Task<ActionResult<List<AssignmentSummary>>> GetAssignments(int classId)
        {
            var teacherId = CurrentTeacherId();
            if (teacherId == null)
            {
                return Unauthorized();
            }

            if (!await OwnsClassAsync(classId, teacherId.Value))
            {
                return NotFound(new { message = "Class not found." });
            }

            var assignments = await _context.Assignments
                .Where(a => a.ClassId == classId)
                .OrderByDescending(a => a.DueAt)
                .Select(a => new AssignmentSummary
                {
                    Id = a.Id,
                    Title = a.Title,
                    Description = a.Description,
                    DueAt = a.DueAt,
                    SubmissionCount = _context.AssignmentSubmissions.Count(s => s.AssignmentId == a.Id),
                })
                .ToListAsync();

            return Ok(assignments);
        }

        // Scenario 1 (AA-55) - title, description, and a future deadline creates the assignment,
        // immediately visible to every Student enrolled in this class (StudentService's
        // GetAssignments reads the same table, no caching layer). The deadline follows the exact
        // same past-date rule as class scheduling - compared in UTC against DateTime.UtcNow.
        [HttpPost]
        public async Task<ActionResult<AssignmentSummary>> CreateAssignment(int classId, [FromBody] CreateAssignmentRequest request)
        {
            var teacherId = CurrentTeacherId();
            if (teacherId == null)
            {
                return Unauthorized();
            }

            if (!await OwnsClassAsync(classId, teacherId.Value))
            {
                return NotFound(new { message = "Class not found." });
            }

            var title = (request.Title ?? string.Empty).Trim();
            var description = (request.Description ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(title))
            {
                return BadRequest(new { message = "Assignment title is required." });
            }
            if (title.Length > 150)
            {
                return BadRequest(new { message = "Assignment title must be 150 characters or fewer." });
            }
            if (string.IsNullOrWhiteSpace(description))
            {
                return BadRequest(new { message = "Assignment description is required." });
            }
            if (description.Length > 2000)
            {
                return BadRequest(new { message = "Assignment description must be 2000 characters or fewer." });
            }

            if (request.DueAt <= DateTime.UtcNow)
            {
                return BadRequest(new { message = "Due date and time cannot be in the past." });
            }

            var assignment = new Assignment
            {
                ClassId = classId,
                Title = title,
                Description = description,
                DueAt = request.DueAt.ToUniversalTime(),
            };

            _context.Assignments.Add(assignment);
            await _context.SaveChangesAsync();

            return Ok(new AssignmentSummary
            {
                Id = assignment.Id,
                Title = assignment.Title,
                Description = assignment.Description,
                DueAt = assignment.DueAt,
                SubmissionCount = 0,
            });
        }
    }
}
