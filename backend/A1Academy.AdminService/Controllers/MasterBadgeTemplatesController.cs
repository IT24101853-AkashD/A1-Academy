using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;
using A1Academy.AdminService.Models;

namespace A1Academy.AdminService.Controllers;

[ApiController]
[Route("api/admin/badges")]
[Authorize(Roles = "Admin")]
public class MasterBadgeTemplatesController : ControllerBase
{
    private readonly AppDbContext _context;

    public MasterBadgeTemplatesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MasterBadgeDto>>> GetAllBadges()
    {
        var badges = await _context.MasterBadgeTemplates
            .AsNoTracking()
            .Select(b => new MasterBadgeDto
            {
                Id = b.Id,
                Name = b.Name,
                IconName = b.IconName,
                Criteria = b.Criteria,
                CreatedAt = b.CreatedAt,
                UpdatedAt = b.UpdatedAt
            })
            .ToListAsync();

        return Ok(badges);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MasterBadgeDto>> GetBadge(int id)
    {
        var badge = await _context.MasterBadgeTemplates
            .AsNoTracking()
            .Where(b => b.Id == id)
            .Select(b => new MasterBadgeDto
            {
                Id = b.Id,
                Name = b.Name,
                IconName = b.IconName,
                Criteria = b.Criteria,
                CreatedAt = b.CreatedAt,
                UpdatedAt = b.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (badge == null)
        {
            return NotFound(new { message = "Badge template not found." });
        }

        return Ok(badge);
    }

    [HttpPost]
    public async Task<ActionResult<MasterBadgeDto>> CreateBadge([FromBody] CreateMasterBadgeDto dto)
    {
        var badge = new MasterBadgeTemplate
        {
            Name = dto.Name,
            IconName = dto.IconName,
            Criteria = dto.Criteria,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.MasterBadgeTemplates.Add(badge);
        await _context.SaveChangesAsync();

        var result = new MasterBadgeDto
        {
            Id = badge.Id,
            Name = badge.Name,
            IconName = badge.IconName,
            Criteria = badge.Criteria,
            CreatedAt = badge.CreatedAt,
            UpdatedAt = badge.UpdatedAt
        };

        return CreatedAtAction(nameof(GetBadge), new { id = badge.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBadge(int id, [FromBody] UpdateMasterBadgeDto dto)
    {
        var badge = await _context.MasterBadgeTemplates.FindAsync(id);
        
        if (badge == null)
        {
            return NotFound(new { message = "Badge template not found." });
        }

        badge.Name = dto.Name;
        badge.IconName = dto.IconName;
        badge.Criteria = dto.Criteria;
        badge.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBadge(int id)
    {
        var badge = await _context.MasterBadgeTemplates.FindAsync(id);
        
        if (badge == null)
        {
            return NotFound(new { message = "Badge template not found." });
        }

        _context.MasterBadgeTemplates.Remove(badge);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
