using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using A1Academy.API.Data;
using A1Academy.API.Data.Models;

namespace A1Academy.API.Controllers
{
    /// <summary>
    /// Academic subject categories Teachers group their classes under. Creation and updates are
    /// Administrator-only; reading the list is open to any authenticated role, since Teachers -
    /// not just Admins - are the ones who need to see what categories exist to schedule classes
    /// under them.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CategoriesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CategoriesController(AppDbContext context)
        {
            _context = context;
        }

        public class CategorySummary
        {
            public int Id { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
        }

        public class CreateCategoryRequest
        {
            public string Name { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
        }

        public class UpdateCategoryRequest
        {
            public string Name { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
        }

        private const int MaxNameLength = 100;
        private const int MaxDescriptionLength = 500;

        [HttpGet]
        public async Task<ActionResult<List<CategorySummary>>> GetCategories()
        {
            var categories = await _context.Categories
                .OrderBy(c => c.Name)
                .Select(c => new CategorySummary { Id = c.Id, Name = c.Name, Description = c.Description })
                .ToListAsync();

            return Ok(categories);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CategorySummary>> GetCategoryById(int id)
        {
            var category = await _context.Categories
                .Where(c => c.Id == id)
                .Select(c => new CategorySummary { Id = c.Id, Name = c.Name, Description = c.Description })
                .SingleOrDefaultAsync();

            if (category == null)
            {
                return NotFound(new { message = "Category not found." });
            }

            return Ok(category);
        }

        // The ticket itself - an Administrator provides a Category Name and Description and it's
        // saved immediately, available to the very next GET (no caching layer sits in front of
        // this, so "immediately available for class scheduling" falls out for free).
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<ActionResult<CategorySummary>> CreateCategory([FromBody] CreateCategoryRequest request)
        {
            var name = (request.Name ?? string.Empty).Trim();
            var description = (request.Description ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest(new { message = "Category name is required." });
            }

            if (name.Length > MaxNameLength)
            {
                return BadRequest(new { message = $"Category name must be {MaxNameLength} characters or fewer." });
            }

            if (string.IsNullOrWhiteSpace(description))
            {
                return BadRequest(new { message = "Category description is required." });
            }

            if (description.Length > MaxDescriptionLength)
            {
                return BadRequest(new { message = $"Category description must be {MaxDescriptionLength} characters or fewer." });
            }

            // Two categories with the same name (however they differ in case) would just confuse
            // whoever's picking one when scheduling a class, so this is checked as a real
            // business rule rather than left to a database unique-constraint 500 error.
            var nameTaken = await _context.Categories.AnyAsync(c => c.Name.ToLower() == name.ToLower());
            if (nameTaken)
            {
                return BadRequest(new { message = "A category with this name already exists." });
            }

            var category = new Category { Name = name, Description = description };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync();

            var summary = new CategorySummary { Id = category.Id, Name = category.Name, Description = category.Description };
            return CreatedAtAction(nameof(GetCategoryById), new { id = category.Id }, summary);
        }

        // The "Category Update" ticket - an Administrator corrects a typo or updates the
        // curriculum on an existing category. Same validation as creation, saved the same way
        // (no caching layer in front of GET /api/categories), so the Student browsing grid and
        // any Teacher scheduling form pick up the change on their very next fetch.
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<ActionResult<CategorySummary>> UpdateCategory(int id, [FromBody] UpdateCategoryRequest request)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null)
            {
                return NotFound(new { message = "Category not found." });
            }

            var name = (request.Name ?? string.Empty).Trim();
            var description = (request.Description ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest(new { message = "Category name is required." });
            }

            if (name.Length > MaxNameLength)
            {
                return BadRequest(new { message = $"Category name must be {MaxNameLength} characters or fewer." });
            }

            if (string.IsNullOrWhiteSpace(description))
            {
                return BadRequest(new { message = "Category description is required." });
            }

            if (description.Length > MaxDescriptionLength)
            {
                return BadRequest(new { message = $"Category description must be {MaxDescriptionLength} characters or fewer." });
            }

            // Same case-insensitive uniqueness rule as creation - but a category is naturally
            // still "unchanged" if it keeps its own current name, so that one match is excluded
            // from the clash check instead of the update rejecting itself.
            var nameTaken = await _context.Categories.AnyAsync(c => c.Id != id && c.Name.ToLower() == name.ToLower());
            if (nameTaken)
            {
                return BadRequest(new { message = "A category with this name already exists." });
            }

            category.Name = name;
            category.Description = description;
            await _context.SaveChangesAsync();

            var summary = new CategorySummary { Id = category.Id, Name = category.Name, Description = category.Description };
            return Ok(summary);
        }
    }
}
