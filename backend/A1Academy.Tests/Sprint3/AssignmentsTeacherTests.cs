using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;
using A1Academy.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace A1Academy.Tests.Sprint3
{
    public class AssignmentsTeacherTests : IClassFixture<ApiWebApplicationFactory>
    {
        private readonly ApiWebApplicationFactory _factory;

        public AssignmentsTeacherTests(ApiWebApplicationFactory factory)
        {
            _factory = factory;
        }

        private async Task SeedUserAsync(string firstName, string lastName, string email, string password, string role)
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            context.Users.Add(new User
            {
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                Role = role,
                AuthProvider = "Local",
                IsEmailVerified = true,
                AccountStatus = AccountStatus.Active,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
            });
            await context.SaveChangesAsync();
        }

        private async Task<string> LoginAsync(HttpClient client, string email, string password)
        {
            var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            return body.GetProperty("token").GetString()!;
        }

        private async Task<(HttpClient client, string token, int userId)> GetAuthenticatedClientAndId(string role)
        {
            var client = _factory.CreateClient();
            var email = $"{role.ToLower()}.{Guid.NewGuid():N}@example.com";
            await SeedUserAsync("Test", role, email, "Password123!", role);
            var token = await LoginAsync(client, email, "Password123!");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.SingleAsync(u => u.Email == email);
            return (client, token, user.Id);
        }

        private async Task<int> SeedCategoryAsync()
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var category = new Category { Name = "Category " + Guid.NewGuid(), Description = "Test" };
            db.Categories.Add(category);
            await db.SaveChangesAsync();
            return category.Id;
        }

        private async Task<int> SeedClassAsync(int teacherId)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var categoryId = await SeedCategoryAsync();
            var newClass = new Class
            {
                Name = "Test Class " + Guid.NewGuid(),
                CategoryId = categoryId,
                TeacherId = teacherId,
                ScheduledAt = DateTime.UtcNow.AddDays(2),
                Capacity = 30,
                Status = ClassStatus.Active
            };
            db.Classes.Add(newClass);
            await db.SaveChangesAsync();
            return newClass.Id;
        }

        private async Task SeedEnrollmentAsync(int classId, int studentId)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Enrollments.Add(new Enrollment { ClassId = classId, StudentId = studentId });
            await db.SaveChangesAsync();
        }

        private async Task SeedSubmissionAsync(int assignmentId, int studentId, string status = SubmissionStatus.Submitted)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var submission = new AssignmentSubmission
            {
                AssignmentId = assignmentId,
                StudentId = studentId,
                FileName = "homework.pdf",
                ContentType = "application/pdf",
                Content = new byte[] { 1, 2, 3 },
                Status = status
            };
            db.AssignmentSubmissions.Add(submission);
            await db.SaveChangesAsync();
        }

        private async Task<int> SeedAssignmentAsync(int classId)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var assignment = new Assignment
            {
                ClassId = classId,
                Title = "Test Homework",
                Description = "Do the homework",
                DueAt = DateTime.UtcNow.AddDays(1)
            };
            db.Assignments.Add(assignment);
            await db.SaveChangesAsync();
            return assignment.Id;
        }

        [Fact]
        public async Task AT_UT_01_And_IT_01_CreateValidAssignment_PersistsCorrectly()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId);

            var request = new { Title = "Homework 1", Description = "Solve questions 1-10", DueAt = DateTime.UtcNow.AddDays(1) };
            var response = await client.PostAsJsonAsync($"/api/teacher/classes/{classId}/assignments", request);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var assignment = await db.Assignments.FirstOrDefaultAsync(a => a.ClassId == classId);
            Assert.NotNull(assignment);
            Assert.Equal("Homework 1", assignment.Title);
        }

        [Fact]
        public async Task AT_UT_02_TitleGreaterThan150Chars_ReturnsBadRequest()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId);

            var request = new { Title = new string('A', 151), Description = "Desc", DueAt = DateTime.UtcNow.AddDays(1) };
            var response = await client.PostAsJsonAsync($"/api/teacher/classes/{classId}/assignments", request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task AT_UT_03_DescriptionGreaterThan2000Chars_ReturnsBadRequest()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId);

            var request = new { Title = "Title", Description = new string('A', 2001), DueAt = DateTime.UtcNow.AddDays(1) };
            var response = await client.PostAsJsonAsync($"/api/teacher/classes/{classId}/assignments", request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task AT_UT_04_DeadlineInThePast_ReturnsBadRequest()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId);

            var request = new { Title = "Title", Description = "Desc", DueAt = DateTime.UtcNow.AddDays(-1) };
            var response = await client.PostAsJsonAsync($"/api/teacher/classes/{classId}/assignments", request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task AT_UT_05_WhitespaceOnlyTitleOrDescription_ReturnsBadRequest()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId);

            var request = new { Title = "   ", Description = "   ", DueAt = DateTime.UtcNow.AddDays(1) };
            var response = await client.PostAsJsonAsync($"/api/teacher/classes/{classId}/assignments", request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task AT_IT_02_CreateAssignmentForAnotherTeachersClass_ReturnsNotFound()
        {
            var (clientA, _, teacherIdA) = await GetAuthenticatedClientAndId("Teacher");
            var (clientB, _, teacherIdB) = await GetAuthenticatedClientAndId("Teacher");
            
            var classIdA = await SeedClassAsync(teacherIdA);

            var request = new { Title = "Title", Description = "Desc", DueAt = DateTime.UtcNow.AddDays(1) };
            var response = await clientB.PostAsJsonAsync($"/api/teacher/classes/{classIdA}/assignments", request);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task AT_IT_03_ViewStudentSubmissionsAPI_ReturnsDescendingList()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var (_, _, studentId) = await GetAuthenticatedClientAndId("Student");
            var classId = await SeedClassAsync(teacherId);
            await SeedEnrollmentAsync(classId, studentId);
            
            var assignmentId = await SeedAssignmentAsync(classId);
            await SeedSubmissionAsync(assignmentId, studentId);

            var response = await client.GetAsync($"/api/teacher/classes/{classId}/assignments/{assignmentId}/submissions");
            
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains("homework.pdf", body);
        }
    }
}
