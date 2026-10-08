using System.ComponentModel.DataAnnotations;

namespace A1Academy.TeacherService.Models
{
    public class GradeSubmissionDto
    {
        [Required(ErrorMessage = "Grade is required")]
        [Range(0, 100, ErrorMessage = "Grade must be between 0 and 100")]
        public int Grade { get; set; }

        [StringLength(1000)]
        public string? Feedback { get; set; }
    }
}
