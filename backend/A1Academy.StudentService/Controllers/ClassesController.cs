using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;
using A1Academy.Shared.Utilities;

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

        [HttpGet("export")]
        public async Task<IActionResult> ExportMyClasses()
        {
            var studentId = CurrentStudentId();
            if (studentId == null)
            {
                return Unauthorized();
            }

            var enrollments = await _context.Enrollments
                .Where(e => e.StudentId == studentId.Value)
                .Include(e => e.Class!).ThenInclude(c => c.Category)
                .Include(e => e.Class!).ThenInclude(c => c.Teacher)
                .OrderByDescending(e => e.Class!.ScheduledAt)
                .ToListAsync();

            var enrolledClassIds = enrollments.Select(e => e.ClassId).ToList();

            var attendances = await _context.Attendances
                .Where(a => a.StudentId == studentId.Value && enrolledClassIds.Contains(a.ClassId))
                .ToListAsync();

            var assignments = await _context.Assignments
                .Where(a => enrolledClassIds.Contains(a.ClassId))
                .ToListAsync();

            var assignmentIds = assignments.Select(a => a.Id).ToList();

            var submissions = await _context.AssignmentSubmissions
                .Where(s => s.StudentId == studentId.Value && assignmentIds.Contains(s.AssignmentId))
                .ToListAsync();

            var csv = new CsvBuilder();
            csv.AddRow(
                "Class ID",
                "Class Name",
                "Subject",
                "Teacher",
                "Scheduled At (UTC)",
                "Class Status",
                "Attendance Status",
                "Graded Submissions",
                "Average Grade"
            );

            foreach (var e in enrollments)
            {
                var c = e.Class!;
                var teacherName = c.Teacher != null ? $"{c.Teacher.FirstName} {c.Teacher.LastName}".Trim() : string.Empty;
                var att = attendances.FirstOrDefault(a => a.ClassId == c.Id);
                var attStatus = att?.Status ?? "Unmarked";

                var classAsgIds = assignments.Where(a => a.ClassId == c.Id).Select(a => a.Id).ToList();
                var classSubs = submissions.Where(s => classAsgIds.Contains(s.AssignmentId) && s.Grade.HasValue).ToList();
                var avgGradeStr = classSubs.Count > 0
                    ? $"{Math.Round(classSubs.Average(s => s.Grade!.Value), 1)}%"
                    : "Not graded";

                csv.AddRow(
                    c.Id.ToString(),
                    c.Name,
                    c.Category?.Name ?? string.Empty,
                    teacherName,
                    c.ScheduledAt.ToString("u"),
                    c.Status,
                    attStatus,
                    classSubs.Count.ToString(),
                    avgGradeStr
                );
            }

            return File(csv.ToByteArray(), "text/csv; charset=utf-8", "my-classes-report.csv");
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

        public class StudentProgressDto
        {
            public int StudentId { get; set; }
            public string StudentName { get; set; } = string.Empty;
            public int EnrolledClassesCount { get; set; }
            public int TotalAttendanceRecords { get; set; }
            public int PresentAttendanceRecords { get; set; }
            public double OverallAttendancePercentage { get; set; }
            public int TotalSubmissionsCount { get; set; }
            public int GradedSubmissionsCount { get; set; }
            public double OverallAverageGrade { get; set; }
            public List<ClassProgressItemDto> ClassDetails { get; set; } = new();
        }

        public class ClassProgressItemDto
        {
            public int ClassId { get; set; }
            public string ClassName { get; set; } = string.Empty;
            public string CategoryName { get; set; } = string.Empty;
            public string TeacherName { get; set; } = string.Empty;
            public int TotalAttendance { get; set; }
            public int PresentAttendance { get; set; }
            public double? AttendancePercentage { get; set; }
            public int GradedSubmissions { get; set; }
            public double? AverageGrade { get; set; }
        }

        // Scenario 1 & 2 - Personalised Student Progress Card: computes overall attendance
        // percentage and average grade across all enrolled classes strictly for the authenticated
        // student from their JWT claim, guaranteeing zero cross-student data leakage.
        [HttpGet("my-progress")]
        public async Task<ActionResult<StudentProgressDto>> GetMyProgress()
        {
            var studentId = CurrentStudentId();
            if (studentId == null)
            {
                return Unauthorized();
            }

            var student = await _context.Users.FindAsync(studentId.Value);
            if (student == null)
            {
                return NotFound(new { message = "Student not found." });
            }

            // 1. Enrolled classes
            var enrollments = await _context.Enrollments
                .Where(e => e.StudentId == studentId.Value)
                .Include(e => e.Class!).ThenInclude(c => c.Category)
                .Include(e => e.Class!).ThenInclude(c => c.Teacher)
                .ToListAsync();

            var enrolledClassIds = enrollments.Select(e => e.ClassId).ToList();

            // 2. Attendance records for this student
            var attendances = await _context.Attendances
                .Where(a => a.StudentId == studentId.Value)
                .ToListAsync();

            var totalAttendanceRecords = attendances.Count;
            var presentAttendanceRecords = attendances.Count(a => a.Status == AttendanceStatus.Present);
            double overallAttendancePercentage = totalAttendanceRecords > 0
                ? Math.Round((presentAttendanceRecords / (double)totalAttendanceRecords) * 100, 1)
                : 0.0;

            // 3. Assignment submissions for enrolled classes
            var assignments = await _context.Assignments
                .Where(a => enrolledClassIds.Contains(a.ClassId))
                .ToListAsync();

            var assignmentIds = assignments.Select(a => a.Id).ToList();

            var submissions = await _context.AssignmentSubmissions
                .Where(s => s.StudentId == studentId.Value && assignmentIds.Contains(s.AssignmentId))
                .ToListAsync();

            var gradedSubmissions = submissions.Where(s => s.Grade.HasValue).ToList();
            double overallAverageGrade = gradedSubmissions.Count > 0
                ? Math.Round(gradedSubmissions.Average(s => s.Grade!.Value), 1)
                : 0.0;

            // 4. Per-class breakdown
            var classDetails = enrollments.Select(e =>
            {
                var c = e.Class!;
                var classAttendances = attendances.Where(a => a.ClassId == c.Id).ToList();
                var classPresent = classAttendances.Count(a => a.Status == AttendanceStatus.Present);
                double? classAttPct = classAttendances.Count > 0
                    ? Math.Round((classPresent / (double)classAttendances.Count) * 100, 1)
                    : null;

                var classAsgIds = assignments.Where(a => a.ClassId == c.Id).Select(a => a.Id).ToList();
                var classSubs = submissions.Where(s => classAsgIds.Contains(s.AssignmentId) && s.Grade.HasValue).ToList();
                double? classAvgGrade = classSubs.Count > 0
                    ? Math.Round(classSubs.Average(s => s.Grade!.Value), 1)
                    : null;

                return new ClassProgressItemDto
                {
                    ClassId = c.Id,
                    ClassName = c.Name,
                    CategoryName = c.Category?.Name ?? string.Empty,
                    TeacherName = c.Teacher != null ? $"{c.Teacher.FirstName} {c.Teacher.LastName}".Trim() : string.Empty,
                    TotalAttendance = classAttendances.Count,
                    PresentAttendance = classPresent,
                    AttendancePercentage = classAttPct,
                    GradedSubmissions = classSubs.Count,
                    AverageGrade = classAvgGrade
                };
            }).ToList();

            var result = new StudentProgressDto
            {
                StudentId = student.Id,
                StudentName = $"{student.FirstName} {student.LastName}".Trim(),
                EnrolledClassesCount = enrollments.Count,
                TotalAttendanceRecords = totalAttendanceRecords,
                PresentAttendanceRecords = presentAttendanceRecords,
                OverallAttendancePercentage = overallAttendancePercentage,
                TotalSubmissionsCount = submissions.Count,
                GradedSubmissionsCount = gradedSubmissions.Count,
                OverallAverageGrade = overallAverageGrade,
                ClassDetails = classDetails
            };

            return Ok(result);
        }
    }
}
