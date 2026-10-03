using System.ComponentModel.DataAnnotations;

namespace A1Academy.AdminService.Models;

public class CreateMasterBadgeDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? IconName { get; set; }

    [Required]
    [MaxLength(1000)]
    public string Criteria { get; set; } = string.Empty;
}

public class UpdateMasterBadgeDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? IconName { get; set; }

    [Required]
    [MaxLength(1000)]
    public string Criteria { get; set; } = string.Empty;
}

public class MasterBadgeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? IconName { get; set; }
    public string Criteria { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
