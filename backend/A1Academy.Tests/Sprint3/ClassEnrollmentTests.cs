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
    public class ClassEnrollmentTests : IClassFixture<ApiWebApplicationFactory>
    {
        private readonly ApiWebApplicationFactory _factory;

        public ClassEnrollmentTests(ApiWebApplicationFactory factory)
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

        private async Task<int> SeedClassAsync(int teacherId, int capacity = 30, string status = ClassStatus.Active, int enrolledCount = 0)
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
                Capacity = capacity,
                Status = status,
                EnrolledCount = enrolledCount
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

        [Fact]
        public async Task CE_UT_01_EnrolInActiveClassWithCapacity_ReturnsOk()
        {
            var (client, _, studentId) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId, 30);

            var response = await client.PostAsync($"/api/student/classes/{classId}/enroll", null);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task CE_UT_02_EnrolInCancelledClass_ReturnsConflict()
        {
            var (client, _, studentId) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId, 30, ClassStatus.Cancelled);

            var response = await client.PostAsync($"/api/student/classes/{classId}/enroll", null);
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        }

        [Fact]
        public async Task CE_UT_03_EnrolInClassAtCapacity_ReturnsConflict()
        {
            var (client, _, studentId) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            
            // Seed a class that is already full (Capacity = 1, Enrolled = 1)
            var classId = await SeedClassAsync(teacherId, 1, ClassStatus.Active, 1);

            var response = await client.PostAsync($"/api/student/classes/{classId}/enroll", null);
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        }

        [Fact]
        public async Task CE_UT_04_EnrolInAlreadyEnrolledClass_ReturnsConflict()
        {
            var (client, _, studentId) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId, 30);
            await SeedEnrollmentAsync(classId, studentId);

            var response = await client.PostAsync($"/api/student/classes/{classId}/enroll", null);
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        }

        [Fact]
        public async Task CE_IT_01_SuccessfulEnrolment_PersistsInDBAndIncrementsCount()
        {
            var (client, _, studentId) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId, 30, ClassStatus.Active, 0);

            await client.PostAsync($"/api/student/classes/{classId}/enroll", null);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var targetClass = await db.Classes.FindAsync(classId);
            var isEnrolled = await db.Enrollments.AnyAsync(e => e.ClassId == classId && e.StudentId == studentId);
            
            Assert.Equal(1, targetClass!.EnrolledCount);
            Assert.True(isEnrolled);
        }

        [Fact]
        public async Task CE_IT_02_AttemptEnrolmentInNonExistentClass_ReturnsNotFound()
        {
            var (client, _, _) = await GetAuthenticatedClientAndId("Student");

            var response = await client.PostAsync($"/api/student/classes/999999/enroll", null);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task CE_IT_03_TeacherAttemptsEnrolment_ReturnsForbidden()
        {
            var (client, _, _) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(999);

            var response = await client.PostAsync($"/api/student/classes/{classId}/enroll", null);
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }
}
