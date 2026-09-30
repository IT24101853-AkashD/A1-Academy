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
    public class AssignmentSubmissionsTests : IClassFixture<ApiWebApplicationFactory>
    {
        private readonly ApiWebApplicationFactory _factory;

        public AssignmentSubmissionsTests(ApiWebApplicationFactory factory)
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

        private async Task<int> SeedAssignmentAsync(int classId, DateTime dueAt)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var assignment = new Assignment
            {
                ClassId = classId,
                Title = "Test Homework",
                Description = "Do the homework",
                DueAt = dueAt
            };
            db.Assignments.Add(assignment);
            await db.SaveChangesAsync();
            return assignment.Id;
        }

        private MultipartFormDataContent CreateFileContent(string fileName, string contentType, int sizeBytes, string name = "file")
        {
            var content = new MultipartFormDataContent();
            var bytes = new byte[sizeBytes];
            var fileContent = new ByteArrayContent(bytes);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
            content.Add(fileContent, name, fileName);
            return content;
        }

        [Fact]
        public async Task AS_UT_01_And_IT_01_SubmitBeforeDeadline_SavedAsSubmitted()
        {
            var (client, _, studentId) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            
            var classId = await SeedClassAsync(teacherId);
            await SeedEnrollmentAsync(classId, studentId);
            var assignmentId = await SeedAssignmentAsync(classId, DateTime.UtcNow.AddDays(1));

            var formData = CreateFileContent("homework.pdf", "application/pdf", 1024);
            var response = await client.PostAsync($"/api/student/classes/{classId}/assignments/{assignmentId}/submit", formData);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var submission = await db.AssignmentSubmissions.FirstOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == studentId);
            Assert.NotNull(submission);
            Assert.Equal(SubmissionStatus.Submitted, submission.Status);
        }

        [Fact]
        public async Task AS_UT_02_SubmitAfterDeadline_SavedAsLate()
        {
            var (client, _, studentId) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            
            var classId = await SeedClassAsync(teacherId);
            await SeedEnrollmentAsync(classId, studentId);
            var assignmentId = await SeedAssignmentAsync(classId, DateTime.UtcNow.AddMinutes(-5));

            var formData = CreateFileContent("homework.pdf", "application/pdf", 1024);
            var response = await client.PostAsync($"/api/student/classes/{classId}/assignments/{assignmentId}/submit", formData);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var submission = await db.AssignmentSubmissions.FirstOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == studentId);
            Assert.NotNull(submission);
            Assert.Equal(SubmissionStatus.Late, submission.Status);
        }

        [Fact]
        public async Task AS_UT_03_SubmitEmptyFile_ReturnsBadRequest()
        {
            var (client, _, studentId) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            
            var classId = await SeedClassAsync(teacherId);
            await SeedEnrollmentAsync(classId, studentId);
            var assignmentId = await SeedAssignmentAsync(classId, DateTime.UtcNow.AddDays(1));

            var formData = CreateFileContent("homework.pdf", "application/pdf", 0);
            var response = await client.PostAsync($"/api/student/classes/{classId}/assignments/{assignmentId}/submit", formData);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task AS_UT_04_SubmitFileTooLarge_ReturnsBadRequest()
        {
            var (client, _, studentId) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            
            var classId = await SeedClassAsync(teacherId);
            await SeedEnrollmentAsync(classId, studentId);
            var assignmentId = await SeedAssignmentAsync(classId, DateTime.UtcNow.AddDays(1));

            var formData = CreateFileContent("homework.pdf", "application/pdf", (10 * 1024 * 1024) + 1);
            var response = await client.PostAsync($"/api/student/classes/{classId}/assignments/{assignmentId}/submit", formData);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task AS_IT_02_DuplicateSubmission_ReturnsConflict()
        {
            var (client, _, studentId) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            
            var classId = await SeedClassAsync(teacherId);
            await SeedEnrollmentAsync(classId, studentId);
            var assignmentId = await SeedAssignmentAsync(classId, DateTime.UtcNow.AddDays(1));

            var formData1 = CreateFileContent("homework1.pdf", "application/pdf", 1024);
            await client.PostAsync($"/api/student/classes/{classId}/assignments/{assignmentId}/submit", formData1);

            var formData2 = CreateFileContent("homework2.pdf", "application/pdf", 1024);
            var response2 = await client.PostAsync($"/api/student/classes/{classId}/assignments/{assignmentId}/submit", formData2);

            Assert.Equal(HttpStatusCode.Conflict, response2.StatusCode);
        }

        [Fact]
        public async Task AS_IT_03_SubmitToNonEnrolledClass_ReturnsForbidden()
        {
            var (client, _, _) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            
            var classId = await SeedClassAsync(teacherId);
            var assignmentId = await SeedAssignmentAsync(classId, DateTime.UtcNow.AddDays(1));

            var formData = CreateFileContent("homework.pdf", "application/pdf", 1024);
            var response = await client.PostAsync($"/api/student/classes/{classId}/assignments/{assignmentId}/submit", formData);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }
}
