using System.ComponentModel.DataAnnotations;

namespace A1Academy.API.Data.Models
{
    // An academic subject category (e.g. "Mathematics", "Computer Science") that Teachers group
    // their classes under. Deliberately just a name and a description right now - there's no
    // Class/Course entity yet for a category to actually be attached to, so this is the
    // foundation "Category Creation" lays down for that scheduling feature to build on later.
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
