using System.ComponentModel.DataAnnotations;

namespace A1Academy.Shared.Data.Models;

public class MasterBadgeTemplate
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? IconName { get; set; }

    [Required]
    [MaxLength(1000)]
    public string Criteria { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
