using System.Security.Claims;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;
using A1Academy.Shared.Utilities;

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
            [JsonRequired]
            public int CategoryId { get; set; }
            [JsonRequired]
            public DateTime ScheduledAt { get; set; }
            [JsonRequired]
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

            // A Teacher may only schedule classes in a subject they're registered to teach
            // (TeacherSubjects - chosen at registration, or granted when an Admin approves their
            // "Other" subject request).
            var teachesSubject = await _context.TeacherSubjects
                .AnyAsync(ts => ts.TeacherId == teacherId && ts.CategoryId == request.CategoryId);
            if (!teachesSubject)
            {
                return BadRequest(new { message = "You can only schedule classes for a subject you're registered to teach." });
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

            // Retried on a concurrency conflict: the status change bumps Class.RowVersion so that
            // an enrolment racing this cancellation (StudentService.Enroll) re-reads the class and
            // sees it cancelled, and if an enrolment saved first, this simply re-reads and retries.
            for (var attempt = 1; attempt <= 3; attempt++)
            {
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
                targetClass.BumpConcurrencyStamp();

                try
                {
                    await _context.SaveChangesAsync();
                    return Ok(ToSummary(targetClass));
                }
                catch (DbUpdateConcurrencyException)
                {
                    _context.ChangeTracker.Clear();
                }
            }

            return Conflict(new { message = "This class is busy right now. Please try again." });
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

            var roster = await FetchClassRosterAsync(id);
            return Ok(roster);
        }

        [HttpGet("{id}/roster/export")]
        public async Task<IActionResult> ExportRoster(int id)
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

            var roster = await FetchClassRosterAsync(id);

            var csv = new CsvBuilder();
            csv.AddRow("Student ID", "First Name", "Last Name", "Email", "Attendance Status");
            foreach (var s in roster)
            {
                csv.AddRow(s.Id.ToString(), s.FirstName, s.LastName, s.Email, s.AttendanceStatus ?? "Unmarked");
            }

            return File(csv.ToByteArray(), "text/csv; charset=utf-8", $"class-{id}-roster.csv");
        }

        private async Task<List<StudentSummary>> FetchClassRosterAsync(int classId)
        {
            return await _context.Enrollments
                .Where(e => e.ClassId == classId)
                .Include(e => e.Student)
                .Select(e => new StudentSummary
                {
                    Id = e.Student!.Id,
                    FirstName = e.Student.FirstName,
                    LastName = e.Student.LastName,
                    Email = e.Student.Email,
                    AttendanceStatus = _context.Attendances
                        .Where(a => a.ClassId == classId && a.StudentId == e.StudentId)
                        .Select(a => a.Status)
                        .FirstOrDefault(),
                })
                .ToListAsync();
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

            var classStatus = await _context.Classes
                .Where(c => c.Id == id && c.TeacherId == teacherId)
                .Select(c => c.Status)
                .SingleOrDefaultAsync();
            if (classStatus == null)
            {
                return NotFound(new { message = "Class not found." });
            }

            if (classStatus == ClassStatus.Cancelled)
            {
                return Conflict(new { message = "Attendance can't be marked for a cancelled class." });
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

        public class GradeBucketDto
        {
            public string Label { get; set; } = string.Empty;
            public string GradeRange { get; set; } = string.Empty;
            public int Count { get; set; }
            public double Percentage { get; set; }
        }

        public class AssignmentGradeStatDto
        {
            public int AssignmentId { get; set; }
            public string Title { get; set; } = string.Empty;
            public DateTime DueAt { get; set; }
            public int SubmissionsCount { get; set; }
            public int GradedCount { get; set; }
            public double? AverageGrade { get; set; }
            public int? MinGrade { get; set; }
            public int? MaxGrade { get; set; }
        }

        public class GradeDistributionReportDto
        {
            public int ClassId { get; set; }
            public string ClassName { get; set; } = string.Empty;
            public string CategoryName { get; set; } = string.Empty;
            public int EnrolledCount { get; set; }
            public string Status { get; set; } = string.Empty;
            public DateTime ScheduledAt { get; set; }
            public int TotalAssignments { get; set; }
            public int TotalSubmissions { get; set; }
            public int GradedSubmissionsCount { get; set; }
            public double AverageGrade { get; set; }
            public List<GradeBucketDto> Distribution { get; set; } = new();
            public List<AssignmentGradeStatDto> Assignments { get; set; } = new();
        }

        private static GradeBucketDto CreateBucket(string label, string range, int count, int totalGraded)
        {
            var percentage = totalGraded > 0 ? Math.Round((count / (double)totalGraded) * 100, 1) : 0.0;
            return new GradeBucketDto
            {
                Label = label,
                GradeRange = range,
                Count = count,
                Percentage = percentage
            };
        }

        [HttpGet("{id}/grade-distribution")]
        public async Task<ActionResult<GradeDistributionReportDto>> GetGradeDistributionReport(int id)
        {
            var teacherId = CurrentTeacherId();
            if (teacherId == null)
            {
                return Unauthorized();
            }

            var targetClass = await _context.Classes
                .Include(c => c.Category)
                .SingleOrDefaultAsync(c => c.Id == id && c.TeacherId == teacherId);

            if (targetClass == null)
            {
                return NotFound(new { message = "Class not found." });
            }

            if (targetClass.Status == ClassStatus.Cancelled)
            {
                return BadRequest(new { message = "Grade distribution reports are only available for active or completed classes." });
            }

            var assignments = await _context.Assignments
                .Where(a => a.ClassId == id)
                .OrderBy(a => a.DueAt)
                .ToListAsync();

            var assignmentIds = assignments.Select(a => a.Id).ToList();

            var submissions = await _context.AssignmentSubmissions
                .Where(s => assignmentIds.Contains(s.AssignmentId))
                .ToListAsync();

            var gradedSubmissions = submissions.Where(s => s.Grade.HasValue).ToList();

            double averageGrade = 0.0;
            if (gradedSubmissions.Count > 0)
            {
                averageGrade = Math.Round(gradedSubmissions.Average(s => s.Grade!.Value), 1);
            }

            var buckets = new List<GradeBucketDto>
            {
                CreateBucket("A (90-100%)", "90-100", gradedSubmissions.Count(s => s.Grade!.Value >= 90), gradedSubmissions.Count),
                CreateBucket("B (80-89%)", "80-89", gradedSubmissions.Count(s => s.Grade!.Value >= 80 && s.Grade!.Value < 90), gradedSubmissions.Count),
                CreateBucket("C (70-79%)", "70-79", gradedSubmissions.Count(s => s.Grade!.Value >= 70 && s.Grade!.Value < 80), gradedSubmissions.Count),
                CreateBucket("D (60-69%)", "60-69", gradedSubmissions.Count(s => s.Grade!.Value >= 60 && s.Grade!.Value < 70), gradedSubmissions.Count),
                CreateBucket("F (0-59%)", "0-59", gradedSubmissions.Count(s => s.Grade!.Value < 60), gradedSubmissions.Count)
            };

            var assignmentStats = assignments.Select(a =>
            {
                var subsForAssignment = submissions.Where(s => s.AssignmentId == a.Id).ToList();
                var gradedForAssignment = subsForAssignment.Where(s => s.Grade.HasValue).ToList();

                double? avg = gradedForAssignment.Count > 0
                    ? Math.Round(gradedForAssignment.Average(s => s.Grade!.Value), 1)
                    : null;
                int? min = gradedForAssignment.Count > 0 ? gradedForAssignment.Min(s => s.Grade!.Value) : null;
                int? max = gradedForAssignment.Count > 0 ? gradedForAssignment.Max(s => s.Grade!.Value) : null;

                return new AssignmentGradeStatDto
                {
                    AssignmentId = a.Id,
                    Title = a.Title,
                    DueAt = a.DueAt,
                    SubmissionsCount = subsForAssignment.Count,
                    GradedCount = gradedForAssignment.Count,
                    AverageGrade = avg,
                    MinGrade = min,
                    MaxGrade = max
                };
            }).ToList();

            var report = new GradeDistributionReportDto
            {
                ClassId = targetClass.Id,
                ClassName = targetClass.Name,
                CategoryName = targetClass.Category?.Name ?? string.Empty,
                EnrolledCount = targetClass.EnrolledCount,
                Status = targetClass.Status,
                ScheduledAt = targetClass.ScheduledAt,
                TotalAssignments = assignments.Count,
                TotalSubmissions = submissions.Count,
                GradedSubmissionsCount = gradedSubmissions.Count,
                AverageGrade = averageGrade,
                Distribution = buckets,
                Assignments = assignmentStats
            };

            return Ok(report);
        }
    }
}
