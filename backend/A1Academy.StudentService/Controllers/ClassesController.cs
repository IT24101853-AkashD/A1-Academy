using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;

namespace A1Academy.StudentService.Controllers
{
    /// <summary>
    /// Lets a Student search/browse scheduled classes and enroll in one. GetClasses only ever
    /// returns Active classes - a Student browsing to join something new has no use for a
    /// cancelled one - while GetMyClasses returns every status, since a Student who was already
    /// enrolled needs to see a cancellation reflected (AA-44 Scenario 2), not have the class
    /// disappear from their dashboard.
    /// </summary>
    [Route("api/student/classes")]
    [ApiController]
    [Authorize(Roles = "Student")]
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
            public int TeacherId { get; set; }
            public string TeacherName { get; set; } = string.Empty;
            public DateTime ScheduledAt { get; set; }
            public int Capacity { get; set; }
            public int EnrolledCount { get; set; }
            public string Status { get; set; } = string.Empty;
            public bool IsEnrolled { get; set; }
        }

        private int? CurrentStudentId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claim, out var id) ? id : null;
        }

        // One lock per Class id, shared across every request in this process (static - a new
        // ClassesController is constructed per request). It only serialises enrolments handled
        // by this replica, which keeps same-replica races from burning retries. The guarantee
        // that holds across replicas is Class.RowVersion: see Enroll's retry loop. Scoped per
        // class id, so enrolling in different classes never blocks on each other.
        private static readonly ConcurrentDictionary<int, SemaphoreSlim> ClassLocks = new();

        // How many times Enroll re-reads the class after losing a concurrency race before giving
        // up. Each retry means another request changed the row first, so a handful is plenty.
        private const int MaxEnrollAttempts = 5;

        // Scenario 1 (AA-45) - teacherName and categoryId both narrow the list, live, via plain
        // EF Core LINQ. Every value here becomes a real SQL parameter (EF Core never builds a
        // query by concatenating strings), which is exactly what AA-92's "parameterized queries"
        // requirement is asking for - there's no separate "safe mode" to opt into, unsafe string
        // concatenation was never an option in the first place.
        [HttpGet]
        public async Task<ActionResult<List<ClassSummary>>> GetClasses([FromQuery] int? categoryId, [FromQuery] string? teacherName)
        {
            var studentId = CurrentStudentId();
            if (studentId == null)
            {
                return Unauthorized();
            }

            var query = _context.Classes
                .Where(c => c.Status == ClassStatus.Active)
                .Include(c => c.Category)
                .Include(c => c.Teacher)
                .AsQueryable();

            if (categoryId.HasValue)
            {
                query = query.Where(c => c.CategoryId == categoryId.Value);
            }

            if (!string.IsNullOrWhiteSpace(teacherName))
            {
                var needle = teacherName.Trim().ToLower();
                query = query.Where(c =>
                    (c.Teacher!.FirstName + " " + (c.Teacher.LastName ?? "")).ToLower().Contains(needle));
            }

            var enrolledClassIds = await _context.Enrollments
                .Where(e => e.StudentId == studentId)
                .Select(e => e.ClassId)
                .ToListAsync();

            var classes = await query.OrderBy(c => c.ScheduledAt).ToListAsync();

            var summaries = classes.Select(c => ToSummary(c, enrolledClassIds.Contains(c.Id))).ToList();
            return Ok(summaries);
        }

        [HttpGet("mine")]
        public async Task<ActionResult<List<ClassSummary>>> GetMyClasses()
        {
            var studentId = CurrentStudentId();
            if (studentId == null)
            {
                return Unauthorized();
            }

            var classes = await _context.Enrollments
                .Where(e => e.StudentId == studentId)
                .Include(e => e.Class!).ThenInclude(c => c.Category)
                .Include(e => e.Class!).ThenInclude(c => c.Teacher)
                .OrderByDescending(e => e.Class!.ScheduledAt)
                .Select(e => e.Class!)
                .ToListAsync();

            return Ok(classes.Select(c => ToSummary(c, true)).ToList());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ClassSummary>> GetClassById(int id)
        {
            var studentId = CurrentStudentId();
            if (studentId == null)
            {
                return Unauthorized();
            }

            var targetClass = await _context.Classes
                .Include(c => c.Category)
                .Include(c => c.Teacher)
                .SingleOrDefaultAsync(c => c.Id == id);

            if (targetClass == null)
            {
                return NotFound(new { message = "Class not found." });
            }

            var isEnrolled = await _context.Enrollments.AnyAsync(e => e.ClassId == id && e.StudentId == studentId);
            return Ok(ToSummary(targetClass, isEnrolled));
        }

        // Scenario 1 (AA-46) - an available class adds the Student to its roster and it shows up
        // on their dashboard. Scenario 1 (AA-47) - a class already at capacity is blocked, and
        // that block holds up even when many Students enrol in the same near-full class at the
        // same moment (AA-49), across every replica of this service: the seat increment is saved
        // with an optimistic concurrency check on Class.RowVersion, so a request that read a
        // seat count someone else has since changed fails to save, re-reads, and re-checks.
        [HttpPost("{id}/enroll")]
        public async Task<ActionResult<ClassSummary>> Enroll(int id)
        {
            var studentId = CurrentStudentId();
            if (studentId == null)
            {
                return Unauthorized();
            }

            var classLock = ClassLocks.GetOrAdd(id, _ => new SemaphoreSlim(1, 1));
            await classLock.WaitAsync();
            try
            {
                for (var attempt = 1; attempt <= MaxEnrollAttempts; attempt++)
                {
                    var targetClass = await _context.Classes
                        .Include(c => c.Category)
                        .Include(c => c.Teacher)
                        .SingleOrDefaultAsync(c => c.Id == id);

                    if (targetClass == null)
                    {
                        return NotFound(new { message = "Class not found." });
                    }

                    if (targetClass.Status != ClassStatus.Active)
                    {
                        return Conflict(new { message = "This class has been cancelled." });
                    }

                    var alreadyEnrolled = await _context.Enrollments
                        .AnyAsync(e => e.ClassId == id && e.StudentId == studentId);
                    if (alreadyEnrolled)
                    {
                        return Conflict(new { message = "You are already enrolled in this class." });
                    }

                    if (targetClass.EnrolledCount >= targetClass.Capacity)
                    {
                        return Conflict(new { message = "This class is full." });
                    }

                    targetClass.EnrolledCount++;
                    targetClass.BumpConcurrencyStamp();
                    _context.Enrollments.Add(new Enrollment { ClassId = id, StudentId = studentId.Value });

                    try
                    {
                        await _context.SaveChangesAsync();
                        return Ok(ToSummary(targetClass, true));
                    }
                    catch (DbUpdateConcurrencyException)
                    {
                        // Another request (on this or another replica) enrolled someone or
                        // cancelled the class after we read it. Nothing was saved - drop our
                        // stale tracked state and re-check against the current row.
                        _context.ChangeTracker.Clear();
                    }
                    catch (DbUpdateException)
                    {
                        // The (StudentId, ClassId) unique index caught this same Student
                        // enrolling twice at once, e.g. a double-click routed to two replicas.
                        _context.ChangeTracker.Clear();
                        return Conflict(new { message = "You are already enrolled in this class." });
                    }
                }

                return Conflict(new { message = "This class is busy right now. Please try again." });
            }
            finally
            {
                classLock.Release();
            }
        }

        private static ClassSummary ToSummary(Class c, bool isEnrolled) => new()
        {
            Id = c.Id,
            Name = c.Name,
            CategoryId = c.CategoryId,
            CategoryName = c.Category?.Name ?? string.Empty,
            TeacherId = c.TeacherId,
            TeacherName = c.Teacher == null ? string.Empty : $"{c.Teacher.FirstName} {c.Teacher.LastName}".Trim(),
            ScheduledAt = c.ScheduledAt,
            Capacity = c.Capacity,
            EnrolledCount = c.EnrolledCount,
            Status = c.Status,
            IsEnrolled = isEnrolled,
        };
    }
}
