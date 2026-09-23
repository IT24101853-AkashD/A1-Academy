using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;

namespace A1Academy.TeacherService.Controllers
{
    /// <summary>
    /// Lets a Teacher upload study material files to a class they own, list what's already
    /// there, and remove one. Content is stored directly in the database (see StudyMaterial) so
    /// StudentService's download endpoint - a different process, with no shared disk - can serve
    /// the exact bytes a Teacher uploaded here.
    /// </summary>
    [Route("api/teacher/classes/{classId}/materials")]
    [ApiController]
    [Authorize(Roles = "Teacher")]
    public class MaterialsController : ControllerBase
    {
        private readonly AppDbContext _context;

        private const long MaxFileSizeBytes = 10 * 1024 * 1024;

        private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/zip",
            "text/plain",
            "image/png",
            "image/jpeg",
        };

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

        private int? CurrentTeacherId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claim, out var id) ? id : null;
        }

        private async Task<bool> OwnsClassAsync(int classId, int teacherId) =>
            await _context.Classes.AnyAsync(c => c.Id == classId && c.TeacherId == teacherId);

        [HttpGet]
        public async Task<ActionResult<List<MaterialSummary>>> GetMaterials(int classId)
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

        // Scenario 1 (AA-52) - a Teacher uploads a file to one of their own classes and it's
        // saved securely, linked to that class record. "Securely" here means: ownership is
        // checked before anything about the file is even read (AA-84), and the file itself is
        // validated for a sane type and a 10MB size cap (AA-86) before being stored.
        [HttpPost]
        [RequestSizeLimit(MaxFileSizeBytes)]
        public async Task<ActionResult<MaterialSummary>> UploadMaterial(int classId, IFormFile file)
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

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Select a file to upload." });
            }

            if (file.Length > MaxFileSizeBytes)
            {
                return BadRequest(new { message = "File must be 10MB or smaller." });
            }

            if (!AllowedContentTypes.Contains(file.ContentType))
            {
                return BadRequest(new { message = "That file type isn't supported. Upload a PDF, Office document, image, text file, or zip." });
            }

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);

            var material = new StudyMaterial
            {
                ClassId = classId,
                // Path.GetFileName strips any directory component a crafted filename might
                // carry, so this is always just a bare file name, never something that could
                // reach outside its own row when later shown to a Student.
                FileName = Path.GetFileName(file.FileName),
                ContentType = file.ContentType,
                Content = stream.ToArray(),
                FileSizeBytes = file.Length,
                UploadedByTeacherId = teacherId.Value,
            };

            _context.StudyMaterials.Add(material);
            await _context.SaveChangesAsync();

            return Ok(new MaterialSummary
            {
                Id = material.Id,
                FileName = material.FileName,
                ContentType = material.ContentType,
                FileSizeBytes = material.FileSizeBytes,
                UploadedAt = material.UploadedAt,
            });
        }

        [HttpDelete("{materialId}")]
        public async Task<IActionResult> DeleteMaterial(int classId, int materialId)
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

            var material = await _context.StudyMaterials.SingleOrDefaultAsync(m => m.Id == materialId && m.ClassId == classId);
            if (material == null)
            {
                return NotFound(new { message = "Material not found." });
            }

            _context.StudyMaterials.Remove(material);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
