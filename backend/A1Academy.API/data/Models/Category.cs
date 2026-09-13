using System.ComponentModel.DataAnnotations;

namespace A1Academy.API.Data.Models
{
    // An academic subject category (e.g. "Mathematics", "Computer Science") that Teachers group
    // their classes under. See Class.cs for the (deliberately minimal) entity that attaches to
    // one of these - added by the "Block Category Deletion" ticket so that ticket's guard has a
    // real dependency to check.
    public class Category
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [StringLength(500)]
        public string Description { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
