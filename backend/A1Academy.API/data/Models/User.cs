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

        // Stamped into every JWT issued at login as a custom claim, and re-checked against this
        // column on every authenticated request (see Program.cs's OnTokenValidated). Rotating it
        // - which UsersController does on every account status transition - is what makes a
        // token issued before a deactivation stop working immediately instead of staying valid
        // until its normal 7-day expiry. A GUID rather than a counter since nothing needs to
        // read the value, only compare it for equality.
        [Required]
        [StringLength(64)]
        public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");

        // Claim type the security stamp is stored under in the JWT. Kept here, next to the
        // column it's checked against, so Login/GoogleLogin (issuing) and Program.cs (validating)
        // can't drift apart on the literal string.
        public const string SecurityStampClaimType = "security_stamp";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
