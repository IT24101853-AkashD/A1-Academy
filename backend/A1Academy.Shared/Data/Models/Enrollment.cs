using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace A1Academy.Shared.Data.Models
{
    // A Student's registration in a specific scheduled Class. The (StudentId, ClassId) unique
    // index (see AppDbContext) makes double-enrollment impossible at the database level, the
    // same way TeacherSubject's unique index does for a Teacher's subject selections.
    public class Enrollment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StudentId { get; set; }

        [ForeignKey(nameof(StudentId))]
        public User? Student { get; set; }

        [Required]
        public int ClassId { get; set; }

        [ForeignKey(nameof(ClassId))]
        public Class? Class { get; set; }

        public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    }
}
