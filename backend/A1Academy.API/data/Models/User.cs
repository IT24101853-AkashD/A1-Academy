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
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string Role { get; set; } = "Student"; // "Student", "Teacher", "Admin"

        // Teacher specific fields
        public string? Qualifications { get; set; }
        public string? QualificationDocumentPath { get; set; }
        
        // Email Verification for OTP
        public bool IsEmailVerified { get; set; } = false;

        // All teachers are pending until an admin approves them
        public bool IsApproved { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
