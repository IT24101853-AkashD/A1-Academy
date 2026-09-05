using System.ComponentModel.DataAnnotations;

namespace A1Academy.API.Data.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string FirstName { get; set; } = string.Empty;

        [StringLength(50)]
        public string? LastName { get; set; }

        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string AuthProvider { get; set; } = "Regular";

        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string Role { get; set; } = "Student"; // "Student", "Teacher", "Admin"

        // Teacher specific fields
        public string? Qualifications { get; set; }
        public string? QualificationDocumentPath { get; set; }
        
        // Email Verification for OTP
        public bool IsEmailVerified { get; set; } = false;

        // Replaces the old IsApproved bool - a bool can only tell you Pending vs Active, and
        // once rejection/deactivation entered the picture that stopped being enough states.
        // See AccountStatus for the full set of values and UsersController's transition
        // endpoints (approve/reject/deactivate/reactivate) for what moves between them.
        [Required]
        [StringLength(20)]
        public string AccountStatus { get; set; } = global::A1Academy.API.Data.Models.AccountStatus.Active;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
