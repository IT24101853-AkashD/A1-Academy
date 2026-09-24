using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace A1Academy.Shared.Data.Models
{
    // A piece of coursework a Teacher sets for one of their classes, with a strict deadline.
    // AssignmentsController rejects a DueAt at or before DateTime.UtcNow at creation time, the
    // same past-date rule ClassesController applies to ScheduledAt.
    public class Assignment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ClassId { get; set; }

        [ForeignKey(nameof(ClassId))]
        public Class? Class { get; set; }

        [Required]
        [StringLength(150)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(2000)]
        public string Description { get; set; } = string.Empty;

        [Required]
        public DateTime DueAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
