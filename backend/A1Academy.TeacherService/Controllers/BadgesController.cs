using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;
using System.ComponentModel.DataAnnotations;

namespace A1Academy.TeacherService.Controllers
{
    [Route("api/teacher/badges")]
    [ApiController]
    [Authorize(Roles = "Teacher")]
    public class BadgesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BadgesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("templates")]
        public async Task<IActionResult> GetMasterBadgeTemplates()
        {
            var teacherId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            // Ensure the teacher is active
            var teacher = await _context.Users.FirstOrDefaultAsync(u => u.Id == teacherId && u.Role == "Teacher");
            if (teacher == null || teacher.AccountStatus != AccountStatus.Active)
            {
                return Forbid();
            }

            var templates = await _context.MasterBadgeTemplates
                .OrderBy(t => t.Name)
                .Select(t => new
                {
                    t.Id,
                    t.Name,
                    t.Criteria,
                    t.IconName
                })
                .ToListAsync();

            return Ok(templates);
        }

        [HttpPost("award")]
        public async Task<IActionResult> AwardBadge([FromBody] AwardBadgeDto dto)
        {
            var teacherId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var teacher = await _context.Users.FirstOrDefaultAsync(u => u.Id == teacherId && u.Role == "Teacher");
            if (teacher == null || teacher.AccountStatus != AccountStatus.Active)
            {
                return Forbid();
            }

            // Verify template exists
            var template = await _context.MasterBadgeTemplates.FindAsync(dto.MasterBadgeTemplateId);
            if (template == null)
            {
                return NotFound(new { message = "Badge template not found." });
            }

            // Verify student exists
            var student = await _context.Users.FirstOrDefaultAsync(u => u.Id == dto.StudentId && u.Role == "Student");
            if (student == null)
            {
                return NotFound(new { message = "Student not found." });
            }

            // (Optional) Verify the student is enrolled in one of the teacher's classes
            var hasEnrollment = await _context.Enrollments
                .Include(e => e.Class)
                .AnyAsync(e => e.StudentId == dto.StudentId && e.Class.TeacherId == teacherId);

            if (!hasEnrollment)
            {
                return BadRequest(new { message = "You can only award badges to students enrolled in your classes." });
            }

            var studentBadge = new StudentBadge
            {
                StudentId = dto.StudentId,
                MasterBadgeTemplateId = dto.MasterBadgeTemplateId,
                AwardedByTeacherId = teacherId,
                Comments = dto.Comments,
                AwardedAt = DateTime.UtcNow
            };

            _context.StudentBadges.Add(studentBadge);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Badge awarded successfully." });
        }
    }

    public class AwardBadgeDto
    {
        [Required]
        public int StudentId { get; set; }

        [Required]
        public int MasterBadgeTemplateId { get; set; }

        public string Comments { get; set; }
    }
}
