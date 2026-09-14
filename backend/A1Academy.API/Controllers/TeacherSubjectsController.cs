using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using A1Academy.API.Data;
using A1Academy.API.Data.Models;

namespace A1Academy.API.Controllers
{
    /// <summary>
    /// Lets a Teacher register which academic subject Categories they teach - separate from
    /// Class Scheduling (which doesn't exist yet; see Class.cs) and from the Category CRUD in
    /// CategoriesController, which stays Administrator-only. The catalogue a Teacher picks from
    /// is always current: GET /api/categories reads the Categories table directly with no
    /// caching layer in front of it, so a Category an Administrator adds after this Teacher last
    /// checked is already there on the very next fetch, the same way CategoriesController's own
    /// comments describe for the Student browsing grid.
    ///
    /// This is a Teacher managing their own record, so - like AuthController's GET/PUT
    /// /api/auth/me - the target is always resolved from the caller's own JWT. There is no
    /// teacher id anywhere in any route or request body here, which makes registering subjects
    /// on someone else's behalf structurally impossible rather than something checked for and
    /// rejected after the fact.
    ///
    /// Registration is one-time and permanent: POST succeeds only while the Teacher has never
    /// registered before, and every attempt after that - even with the exact same subjects -
    /// is rejected with 409 Conflict rather than silently accepted or overwritten. Unlike
    /// AuthController's editable profile fields, there is deliberately no PUT here.
    /// </summary>
    [Route("api/teacher/subjects")]
    [ApiController]
    [Authorize(Roles = "Teacher")]
    public class TeacherSubjectsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TeacherSubjectsController(AppDbContext context)
        {
            _context = context;
        }

        public class TeacherSubjectSummary
        {
            public int CategoryId { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
        }

        public class RegisterTeacherSubjectsRequest
        {
            public List<int> CategoryIds { get; set; } = new();
        }

        private int? CurrentTeacherId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claim, out var id) ? id : null;
        }

        // What subjects has this Teacher registered - empty until their one-time POST below, and
        // fixed from that point on. A frontend uses this to decide whether to show the selection
        // form at all, or just the read-only result of a registration that already happened.
        [HttpGet]
        public async Task<ActionResult<List<TeacherSubjectSummary>>> GetMySubjects()
        {
            var teacherId = CurrentTeacherId();
            if (teacherId == null)
            {
                return Unauthorized();
            }

            var subjects = await _context.TeacherSubjects
                .Where(ts => ts.TeacherId == teacherId)
                .Include(ts => ts.Category)
                .OrderBy(ts => ts.Category!.Name)
                .Select(ts => new TeacherSubjectSummary
                {
                    CategoryId = ts.CategoryId,
                    Name = ts.Category!.Name,
                    Description = ts.Category.Description
                })
                .ToListAsync();

            return Ok(subjects);
        }

        // The registration itself - a Teacher picks the subject(s) they teach from whatever
        // Categories currently exist, once. There's no update/replace path by design: a second
        // call, whether it repeats the same subjects or names different ones, is turned away
        // before anything about the request is even validated, so "already registered" always
        // wins over "is this request otherwise valid".
        [HttpPost]
        public async Task<ActionResult<List<TeacherSubjectSummary>>> RegisterMySubjects([FromBody] RegisterTeacherSubjectsRequest request)
        {
            var teacherId = CurrentTeacherId();
            if (teacherId == null)
            {
                return Unauthorized();
            }

            var alreadyRegistered = await _context.TeacherSubjects.AnyAsync(ts => ts.TeacherId == teacherId);
            if (alreadyRegistered)
            {
                return Conflict(new
                {
                    message = "You've already registered the subject(s) you teach, and that can't be changed. Contact an administrator if this needs to be corrected."
                });
            }

            // De-duplicated so a repeated id in the request can't trip the unique index this
            // relies on, and so the "every id must exist" check below counts each subject once.
            var requestedIds = (request.CategoryIds ?? new List<int>()).Distinct().ToList();

            if (requestedIds.Count == 0)
            {
                return BadRequest(new { message = "Select at least one subject to register." });
            }

            var existingCount = await _context.Categories.CountAsync(c => requestedIds.Contains(c.Id));
            if (existingCount != requestedIds.Count)
            {
                return BadRequest(new { message = "One or more selected subjects don't exist." });
            }

            _context.TeacherSubjects.AddRange(
                requestedIds.Select(id => new TeacherSubject { TeacherId = teacherId.Value, CategoryId = id }));
            await _context.SaveChangesAsync();

            var registered = await _context.TeacherSubjects
                .Where(ts => ts.TeacherId == teacherId)
                .Include(ts => ts.Category)
                .OrderBy(ts => ts.Category!.Name)
                .Select(ts => new TeacherSubjectSummary
                {
                    CategoryId = ts.CategoryId,
                    Name = ts.Category!.Name,
                    Description = ts.Category.Description
                })
                .ToListAsync();

            return Ok(registered);
        }
    }
}
