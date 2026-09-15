using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace A1Academy.Shared.Data.Models
{
    public enum TeacherSubjectRequestStatus { Pending, Approved, Rejected }

    // An "Other, please specify" subject a Teacher typed for themselves at registration, because
    // the Category they wanted to teach wasn't in Admin's list yet (see TeacherSubject for the
    // ordinary checkbox path, where the Category already exists). This never becomes a
    // TeacherSubject by itself - an Admin reviews the proposed name, adds a matching Category if
    // it's a subject worth offering (the existing POST /api/categories, same as any other
    // category), then approves this request against that Category id - see
    // TeacherSubjectRequestsController, which is what actually creates the TeacherSubject row.
    public class TeacherSubjectRequest
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TeacherId { get; set; }

        [ForeignKey(nameof(TeacherId))]
        public User? Teacher { get; set; }

        [Required]
        [StringLength(100)]
        public string ProposedName { get; set; } = string.Empty;

        public TeacherSubjectRequestStatus Status { get; set; } = TeacherSubjectRequestStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ReviewedAt { get; set; }

        // Set once an Admin approves this against a real Category - kept as a record of what the
        // request resolved to even if that Category is later deleted (see AppDbContext's SetNull
        // on this FK).
        public int? ResultingCategoryId { get; set; }

        [ForeignKey(nameof(ResultingCategoryId))]
        public Category? ResultingCategory { get; set; }
    }
}


