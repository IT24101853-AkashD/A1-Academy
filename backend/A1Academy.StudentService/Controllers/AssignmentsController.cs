using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;

namespace A1Academy.StudentService.Controllers
{
    /// <summary>
    /// Lets an enrolled Student see assignments for their class and submit completed work.
    /// Access is gated the same way as MaterialsController - 403 for a non-enrolled Student, not
    /// a 404.
    /// </summary>
    [Route("api/student/classes/{classId}/assignments")]
    [ApiController]
    [Authorize(Roles = "Student")]
    public class AssignmentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        private const long MaxFileSizeBytes = 10 * 1024 * 1024;

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
            public string? MySubmissionStatus { get; set; }
        }

        private int? CurrentStudentId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claim, out var id) ? id : null;
        }

        private async Task<bool> IsEnrolledAsync(int classId, int studentId) =>
            await _context.Enrollments.AnyAsync(e => e.ClassId == classId && e.StudentId == studentId);

        [HttpGet]
        public async Task<ActionResult<List<AssignmentSummary>>> GetAssignments(int classId)
        {
            var studentId = CurrentStudentId();
            if (studentId == null)
            {
                return Unauthorized();
            }

            var classExists = await _context.Classes.AnyAsync(c => c.Id == classId);
            if (!classExists)
            {
                return NotFound(new { message = "Class not found." });
            }

            if (!await IsEnrolledAsync(classId, studentId.Value))
            {
                return Forbid();
            }

            var assignments = await _context.Assignments
                .Where(a => a.ClassId == classId)
                .OrderBy(a => a.DueAt)
                .Select(a => new AssignmentSummary
                {
                    Id = a.Id,
                    Title = a.Title,
                    Description = a.Description,
                    DueAt = a.DueAt,
                    MySubmissionStatus = _context.AssignmentSubmissions
                        .Where(s => s.AssignmentId == a.Id && s.StudentId == studentId)
                        .Select(s => s.Status)
                        .FirstOrDefault(),
                })
                .ToListAsync();

            return Ok(assignments);
        }

        // Scenario 1 (AA-56) - an enrolled Student uploads their completed file and it's
        // recorded. AA-57's automatic late flagging happens right here, at the moment of
        // submission: SubmittedAt (now) compared to the Assignment's DueAt, both UTC, decides
        // Submitted vs Late once and for all - it's never recalculated later, so the status a
        // Teacher sees reflects the exact moment the file came in.
        [HttpPost("{assignmentId}/submissions")]
        [RequestSizeLimit(MaxFileSizeBytes)]
        public async Task<ActionResult<AssignmentSummary>> Submit(int classId, int assignmentId, IFormFile file)
        {
            var studentId = CurrentStudentId();
            if (studentId == null)
            {
                return Unauthorized();
            }

            if (!await IsEnrolledAsync(classId, studentId.Value))
            {
                return Forbid();
            }

            var assignment = await _context.Assignments
                .SingleOrDefaultAsync(a => a.Id == assignmentId && a.ClassId == classId);
            if (assignment == null)
            {
                return NotFound(new { message = "Assignment not found." });
            }

            var alreadySubmitted = await _context.AssignmentSubmissions
                .AnyAsync(s => s.AssignmentId == assignmentId && s.StudentId == studentId);
            if (alreadySubmitted)
            {
                return Conflict(new { message = "You've already submitted this assignment." });
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Select a file to submit." });
            }

            if (file.Length > MaxFileSizeBytes)
            {
                return BadRequest(new { message = "File must be 10MB or smaller." });
            }

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);

            var now = DateTime.UtcNow;
            var status = now > assignment.DueAt ? SubmissionStatus.Late : SubmissionStatus.Submitted;

            var submission = new AssignmentSubmission
            {
                AssignmentId = assignmentId,
                StudentId = studentId.Value,
                FileName = Path.GetFileName(file.FileName),
                ContentType = file.ContentType,
                Content = stream.ToArray(),
                FileSizeBytes = file.Length,
                SubmittedAt = now,
                Status = status,
            };

            _context.AssignmentSubmissions.Add(submission);
            await _context.SaveChangesAsync();

            return Ok(new AssignmentSummary
            {
                Id = assignment.Id,
                Title = assignment.Title,
                Description = assignment.Description,
                DueAt = assignment.DueAt,
                MySubmissionStatus = submission.Status,
            });
        }
    }
}
