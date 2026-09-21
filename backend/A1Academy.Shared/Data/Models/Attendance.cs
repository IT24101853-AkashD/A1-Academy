using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace A1Academy.Shared.Data.Models
{
    // One Student's Present/Absent mark for one Class session. The (ClassId, StudentId) unique
    // index (see AppDbContext) means re-marking a student updates their existing row instead of
    // creating a duplicate - ClassesController's attendance endpoint upserts on this key.
    public class Attendance
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ClassId { get; set; }

        [ForeignKey(nameof(ClassId))]
        public Class? Class { get; set; }

        [Required]
        public int StudentId { get; set; }

        [ForeignKey(nameof(StudentId))]
        public User? Student { get; set; }

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = AttendanceStatus.Present;

        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    }
}
