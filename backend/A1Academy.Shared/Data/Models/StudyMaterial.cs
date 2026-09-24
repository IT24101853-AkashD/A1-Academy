using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace A1Academy.Shared.Data.Models
{
    // A file a Teacher attaches to one of their classes. Content is stored directly in Postgres
    // (not on local disk) because the service that uploads it (TeacherService) and the service
    // that serves it (StudentService) are different containers with no shared filesystem in
    // production - this way both simply read the same database row. MaterialsController on the
    // TeacherService side enforces the size cap (10MB) and a content-type allowlist at upload
    // time; nothing here re-checks that on read.
    public class StudyMaterial
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ClassId { get; set; }

        [ForeignKey(nameof(ClassId))]
        public Class? Class { get; set; }

        [Required]
        [StringLength(255)]
        public string FileName { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string ContentType { get; set; } = string.Empty;

        [Required]
        public byte[] Content { get; set; } = Array.Empty<byte>();

        public long FileSizeBytes { get; set; }

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        // Nullable + SetNull (see AppDbContext) - same reasoning as
        // TeacherSubjectRequest.ResultingCategoryId: the material is still valid and downloadable
        // even if we lose track of exactly who uploaded it.
        public int? UploadedByTeacherId { get; set; }

        [ForeignKey(nameof(UploadedByTeacherId))]
        public User? UploadedByTeacher { get; set; }
    }
}
