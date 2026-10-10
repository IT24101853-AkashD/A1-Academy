using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using A1Academy.Shared.Data;

namespace A1Academy.StudentService.Controllers
{
    [Route("api/recognition")]
    [ApiController]
    public class PublicRecognitionController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PublicRecognitionController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("board")]
        public async Task<IActionResult> GetPublicRecognitionBoard()
        {
            // Fetch the 50 most recent awarded badges across all students
            var recentBadges = await _context.StudentBadges
                .Include(sb => sb.Student)
                .Include(sb => sb.MasterBadgeTemplate)
                .Include(sb => sb.AwardedByTeacher)
                .OrderByDescending(sb => sb.AwardedAt)
                .Take(50)
                .Select(sb => new
                {
                    sb.Id,
                    StudentName = sb.Student.FirstName + " " + (sb.Student.LastName ?? ""),
                    BadgeName = sb.MasterBadgeTemplate.Name,
                    BadgeIcon = sb.MasterBadgeTemplate.IconName,
                    TeacherName = sb.AwardedByTeacher != null ? (sb.AwardedByTeacher.FirstName + " " + sb.AwardedByTeacher.LastName) : "System",
                    sb.Comments,
                    sb.AwardedAt
                })
                .ToListAsync();

            return Ok(recentBadges);
        }
    }
}
