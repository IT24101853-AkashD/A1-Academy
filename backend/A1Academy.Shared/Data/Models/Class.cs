using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace A1Academy.Shared.Data.Models
{
    // Grown from the deliberately-minimal skeleton the "Block Category Deletion" ticket left
    // behind (see the AddClass migration) into a real scheduled session: who's teaching it,
    // when it happens, and how many seats it has.
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

        [Required]
        public int TeacherId { get; set; }

        [ForeignKey(nameof(TeacherId))]
        public User? Teacher { get; set; }

        // Always UTC - ClassesController rejects a value at or before DateTime.UtcNow at
        // creation time, and every other comparison against "now" in this feature (attendance,
        // assignment due dates) follows the same UTC-only convention so nothing can be thrown
        // off by a mismatched time zone.
        [Required]
        public DateTime ScheduledAt { get; set; }

        [Required]
        public int Capacity { get; set; }

        // Maintained by StudentService's enroll endpoint alongside RowVersion below - a plain
        // count rather than computing Enrollments.Count() on every read so the capacity check
        // and the optimistic-concurrency retry (see ClassesController.Enroll) can happen in one
        // round trip instead of a separate COUNT query per attempt.
        public int EnrolledCount { get; set; } = 0;

        // EF Core concurrency token - Npgsql maps this to a real row-version column, and the
        // InMemory provider the test suite uses honors it too, so the enroll endpoint's
        // check-then-increment-then-save can detect a concurrent enrollment (via
        // DbUpdateConcurrencyException) and retry instead of silently overselling seats when two
        // requests race for the last one.
        [Timestamp]
        public byte[]? RowVersion { get; set; }

        // "Active" vs "Cancelled". Reassigning to a different category is just changing
        // CategoryId, not a status change.
        [Required]
        [StringLength(20)]
        public string Status { get; set; } = ClassStatus.Active;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}


