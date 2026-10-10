using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace A1Academy.Shared.Data.Models
{
    public class StudentBadge
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StudentId { get; set; }

        [Required]
        public int MasterBadgeTemplateId { get; set; }

        public int? AwardedByTeacherId { get; set; }

        public DateTime AwardedAt { get; set; } = DateTime.UtcNow;

        [StringLength(2000)]
        public string Comments { get; set; }

        [ForeignKey(nameof(StudentId))]
        public User Student { get; set; }

        [ForeignKey(nameof(MasterBadgeTemplateId))]
        public MasterBadgeTemplate MasterBadgeTemplate { get; set; }

        [ForeignKey(nameof(AwardedByTeacherId))]
        public User AwardedByTeacher { get; set; }
    }
}
