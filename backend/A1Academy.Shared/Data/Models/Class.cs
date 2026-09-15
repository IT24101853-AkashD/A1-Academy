using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace A1Academy.Shared.Data.Models
{
    // Deliberately minimal - just enough for a class to belong to a category and for its
    // status to say whether it's still running. There's no scheduling, no assigned Teacher, no
    // enrollment yet; this exists so the "Block Category Deletion" ticket's guard has a real
    // dependency to check instead of a condition that can never be true (see the comment this
    // replaces on Category.cs). A future Class Scheduling ticket is the right place to grow
    // this into the real thing.
    public class Class
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public int CategoryId { get; set; }

        [ForeignKey(nameof(CategoryId))]
        public Category? Category { get; set; }

        // "Active" vs "Cancelled" - the only two states this ticket's guard distinguishes.
        // Reassigning to a different category is just changing CategoryId, not a status change.
        [Required]
        [StringLength(20)]
        public string Status { get; set; } = ClassStatus.Active;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}


