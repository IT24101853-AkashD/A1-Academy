using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using A1Academy.Shared.Data;

namespace A1Academy.StudentService.Controllers
{
    /// <summary>
    /// Lets an enrolled Student see and download the study materials attached to their classes.
    /// Scenario 2 (AA-54) is the point of this controller: a Student who isn't enrolled gets a
    /// 403 from either endpoint here, not a 404 - a 404 would leak whether the class/material
    /// even exists, and hiding the download link client-side (Scenario 1) is only a UX nicety
    /// backed by this real server-side check, not the actual access control.
    /// </summary>
    [Route("api/student/classes/{classId}/materials")]
    [ApiController]
    [Authorize(Roles = "Student")]
    public class MaterialsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MaterialsController(AppDbContext context)
        {
            _context = context;
        }

        public class MaterialSummary
        {
            public int Id { get; set; }
            public string FileName { get; set; } = string.Empty;
            public string ContentType { get; set; } = string.Empty;
            public long FileSizeBytes { get; set; }
            public DateTime UploadedAt { get; set; }
        }

        private int? CurrentStudentId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claim, out var id) ? id : null;
        }

        private async Task<bool> IsEnrolledAsync(int classId, int studentId) =>
            await _context.Enrollments.AnyAsync(e => e.ClassId == classId && e.StudentId == studentId);

        [HttpGet]
        public async Task<ActionResult<List<MaterialSummary>>> GetMaterials(int classId)
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

            var materials = await _context.StudyMaterials
                .Where(m => m.ClassId == classId)
                .OrderByDescending(m => m.UploadedAt)
                .Select(m => new MaterialSummary
                {
                    Id = m.Id,
                    FileName = m.FileName,
                    ContentType = m.ContentType,
                    FileSizeBytes = m.FileSizeBytes,
                    UploadedAt = m.UploadedAt,
                })
                .ToListAsync();

            return Ok(materials);
        }

        // Scenario 1 (AA-53) - an enrolled Student clicks and the file downloads to their
        // device.
        [HttpGet("{materialId}/download")]
        public async Task<IActionResult> Download(int classId, int materialId)
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

            var material = await _context.StudyMaterials
                .SingleOrDefaultAsync(m => m.Id == materialId && m.ClassId == classId);

            if (material == null)
            {
                return NotFound(new { message = "Material not found." });
            }

            return File(material.Content, material.ContentType, material.FileName);
        }
    }
}
