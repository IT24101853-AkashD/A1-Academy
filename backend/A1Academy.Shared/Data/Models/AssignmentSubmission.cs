using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace A1Academy.Shared.Data.Models
{
    // A Student's uploaded work for one Assignment. The (AssignmentId, StudentId) unique index
    // (see AppDbContext) means one submission per student, permanently - there's no resubmission
    // path, the same one-shot design as TeacherSubject's registration.
    public class AssignmentSubmission
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int AssignmentId { get; set; }

        [ForeignKey(nameof(AssignmentId))]
        public Assignment? Assignment { get; set; }

        [Required]
        public int StudentId { get; set; }

        [ForeignKey(nameof(StudentId))]
        public User? Student { get; set; }

        [Required]
        [StringLength(255)]
        public string FileName { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string ContentType { get; set; } = string.Empty;

        [Required]
        public byte[] Content { get; set; } = Array.Empty<byte>();

        public long FileSizeBytes { get; set; }

        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = SubmissionStatus.Submitted;
    }
}
