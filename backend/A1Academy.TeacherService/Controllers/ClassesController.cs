using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;

namespace A1Academy.TeacherService.Controllers
{
    /// <summary>
    /// Lets an Active Teacher schedule a class session (date, time, seat capacity), cancel one
    /// they've already scheduled, and mark attendance for their own roster. Every action here is
    /// scoped to classes the caller owns - like TeacherSubjectsController, there is no "act on
    /// someone else's class" path, only "act on my own", enforced by checking Class.TeacherId
    /// against the caller's own JWT-derived id rather than trusting an id passed in.
    /// </summary>
    [Route("api/teacher/classes")]
    [ApiController]
    [Authorize(Roles = "Teacher")]
    public class ClassesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ClassesController(AppDbContext context)
        {
            _context = context;
        }

        public class ClassSummary
        {
            public int Id { get; set; }
            public string Name { get; set; } = string.Empty;
            public int CategoryId { get; set; }
            public string CategoryName { get; set; } = string.Empty;
            public DateTime ScheduledAt { get; set; }
            public int Capacity { get; set; }
            public int EnrolledCount { get; set; }
            public string Status { get; set; } = string.Empty;
        }

        public class ScheduleClassRequest
        {
            public string Name { get; set; } = string.Empty;
            public int CategoryId { get; set; }
            public DateTime ScheduledAt { get; set; }
            public int Capacity { get; set; }
        }

        public class StudentSummary
        {
            public int Id { get; set; }
            public string FirstName { get; set; } = string.Empty;
            public string? LastName { get; set; }
            public string Email { get; set; } = string.Empty;
            public string? AttendanceStatus { get; set; }
        }

        public class AttendanceEntry
        {
            public int StudentId { get; set; }
            public string Status { get; set; } = string.Empty;
        }

        public class MarkAttendanceRequest
        {
            public List<AttendanceEntry> Entries { get; set; } = new();
        }

        private const int MaxNameLength = 100;

        private int? CurrentTeacherId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claim, out var id) ? id : null;
        }

        private static ClassSummary ToSummary(Class c) => new()
        {
            Id = c.Id,
            Name = c.Name,
            CategoryId = c.CategoryId,
            CategoryName = c.Category?.Name ?? string.Empty,
            ScheduledAt = c.ScheduledAt,
            Capacity = c.Capacity,
            EnrolledCount = c.EnrolledCount,
            Status = c.Status,
        };

        // Scenario 1 (AA-43) - a future date/time and a positive capacity creates the class
        // immediately, visible to Students on their very next fetch (no caching layer, same as
        // every other listing in this codebase). Scenario 2 - anything at or before "now" is
        // rejected outright, compared in UTC so a Teacher's local time zone can't sneak a
        // technically-past class through.
        [HttpPost]
        public async Task<ActionResult<ClassSummary>> ScheduleClass([FromBody] ScheduleClassRequest request)
        {
            var teacherId = CurrentTeacherId();
            if (teacherId == null)
            {
                return Unauthorized();
            }

            var name = (request.Name ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest(new { message = "Class name is required." });
            }
            if (name.Length > MaxNameLength)
            {
                return BadRequest(new { message = $"Class name must be {MaxNameLength} characters or fewer." });
            }

            var categoryExists = await _context.Categories.AnyAsync(c => c.Id == request.CategoryId);
            if (!categoryExists)
            {
                return BadRequest(new { message = "Select a valid subject category." });
            }

            if (request.ScheduledAt <= DateTime.UtcNow)
            {
                return BadRequest(new { message = "Class date and time must be in the future." });
            }

            if (request.Capacity < 1)
            {
                return BadRequest(new { message = "Capacity must be at least 1 student." });
            }

            var newClass = new Class
            {
                Name = name,
                CategoryId = request.CategoryId,
                TeacherId = teacherId.Value,
                ScheduledAt = request.ScheduledAt.ToUniversalTime(),
                Capacity = request.Capacity,
                Status = ClassStatus.Active,
            };

            _context.Classes.Add(newClass);
            await _context.SaveChangesAsync();

            await _context.Entry(newClass).Reference(c => c.Category).LoadAsync();
            return CreatedAtAction(nameof(GetMyClasses), null, ToSummary(newClass));
        }

        [HttpGet]
        public async Task<ActionResult<List<ClassSummary>>> GetMyClasses()
        {
            var teacherId = CurrentTeacherId();
            if (teacherId == null)
            {
                return Unauthorized();
            }

            var classes = await _context.Classes
                .Where(c => c.TeacherId == teacherId)
                .Include(c => c.Category)
                .OrderByDescending(c => c.ScheduledAt)
                .Select(c => ToSummary(c))
                .ToListAsync();

            return Ok(classes);
        }

        // Scenario 1 (AA-44) - a Teacher cancelling their own scheduled class updates its status
        // immediately. Only the owning Teacher can do this (mirrors every other ownership check
        // in this controller), and only an Active class can be cancelled - cancelling an
        // already-cancelled class is a 409, not a silent no-op, the same way TeacherSubjects
        // treats a second registration attempt as a real conflict rather than ignoring it.
        [HttpPost("{id}/cancel")]
        public async Task<ActionResult<ClassSummary>> CancelClass(int id)
        {
            var teacherId = CurrentTeacherId();
            if (teacherId == null)
            {
                return Unauthorized();
            }

            var targetClass = await _context.Classes.Include(c => c.Category).SingleOrDefaultAsync(c => c.Id == id);
            if (targetClass == null || targetClass.TeacherId != teacherId)
            {
                return NotFound(new { message = "Class not found." });
            }

            if (targetClass.Status == ClassStatus.Cancelled)
            {
                return Conflict(new { message = "This class has already been cancelled." });
            }

            targetClass.Status = ClassStatus.Cancelled;
            await _context.SaveChangesAsync();

            return Ok(ToSummary(targetClass));
        }

        // The roster an attendance-marking screen needs: every Student currently enrolled in
        // this class, plus whatever attendance mark (if any) already exists for them - so
        // re-opening the page after a save shows the state that was actually recorded.
        [HttpGet("{id}/roster")]
        public async Task<ActionResult<List<StudentSummary>>> GetRoster(int id)
        {
            var teacherId = CurrentTeacherId();
            if (teacherId == null)
            {
                return Unauthorized();
            }

            var owns = await _context.Classes.AnyAsync(c => c.Id == id && c.TeacherId == teacherId);
            if (!owns)
            {
                return NotFound(new { message = "Class not found." });
            }

            var roster = await _context.Enrollments
                .Where(e => e.ClassId == id)
                .Include(e => e.Student)
                .Select(e => new StudentSummary
                {
                    Id = e.Student!.Id,
                    FirstName = e.Student.FirstName,
                    LastName = e.Student.LastName,
                    Email = e.Student.Email,
                    AttendanceStatus = _context.Attendances
                        .Where(a => a.ClassId == id && a.StudentId == e.StudentId)
                        .Select(a => a.Status)
                        .FirstOrDefault(),
                })
                .ToListAsync();

            return Ok(roster);
        }

        // Scenario 1 (AA-62) - every mark submitted together is saved in one batch rather than
        // one row at a time. AA-89: any StudentId in the submission that isn't actually enrolled
        // in this class is rejected outright, and nothing is saved - a partial save would leave
        // the roster in a confusing half-recorded state.
        [HttpPost("{id}/attendance")]
        public async Task<ActionResult<List<StudentSummary>>> MarkAttendance(int id, [FromBody] MarkAttendanceRequest request)
        {
            var teacherId = CurrentTeacherId();
            if (teacherId == null)
            {
                return Unauthorized();
            }

            var owns = await _context.Classes.AnyAsync(c => c.Id == id && c.TeacherId == teacherId);
            if (!owns)
            {
                return NotFound(new { message = "Class not found." });
            }

            var entries = request.Entries ?? new List<AttendanceEntry>();
            if (entries.Count == 0)
            {
                return BadRequest(new { message = "Include at least one student's attendance." });
            }

            var validStatuses = new[] { AttendanceStatus.Present, AttendanceStatus.Absent };
            if (entries.Any(e => !validStatuses.Contains(e.Status)))
            {
                return BadRequest(new { message = "Attendance status must be Present or Absent." });
            }

            var enrolledStudentIds = await _context.Enrollments
                .Where(e => e.ClassId == id)
                .Select(e => e.StudentId)
                .ToListAsync();

            var invalidStudentIds = entries.Select(e => e.StudentId).Except(enrolledStudentIds).ToList();
            if (invalidStudentIds.Count > 0)
            {
                return BadRequest(new { message = "One or more students are not enrolled in this class." });
            }

            var existing = await _context.Attendances.Where(a => a.ClassId == id).ToListAsync();

            foreach (var entry in entries)
            {
                var record = existing.FirstOrDefault(a => a.StudentId == entry.StudentId);
                if (record != null)
                {
                    record.Status = entry.Status;
                    record.RecordedAt = DateTime.UtcNow;
                }
                else
                {
                    _context.Attendances.Add(new Attendance
                    {
                        ClassId = id,
                        StudentId = entry.StudentId,
                        Status = entry.Status,
                    });
                }
            }

            await _context.SaveChangesAsync();

            return await GetRoster(id);
        }
    }
}
