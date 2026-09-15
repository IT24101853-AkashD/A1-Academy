using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace A1Academy.Shared.Data.Models
{
    // A Teacher's own declaration that they're willing/qualified to teach a given Category -
    // separate from Class.TeacherId (which doesn't exist yet; see Class.cs) because "I can teach
    // Mathematics" and "I'm scheduled to teach this specific Mathematics class" are different
    // facts. This is the former: a self-reported subject list a Teacher sets from their own
    // dashboard, independent of whatever Class Scheduling grows into later.
    public class TeacherSubject
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TeacherId { get; set; }

        [ForeignKey(nameof(TeacherId))]
        public User? Teacher { get; set; }

        [Required]
        public int CategoryId { get; set; }

        [ForeignKey(nameof(CategoryId))]
        public Category? Category { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}


