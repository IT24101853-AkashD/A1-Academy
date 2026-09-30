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
    public class ClassAttendanceTests : IClassFixture<ApiWebApplicationFactory>
    {
        private readonly ApiWebApplicationFactory _factory;

        public ClassAttendanceTests(ApiWebApplicationFactory factory)
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
                ScheduledAt = DateTime.UtcNow.AddDays(-2), // Class in the past
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

        [Fact]
        public async Task CA_UT_01_And_IT_01_MarkBatchAttendance_UpdatesDB()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var (_, _, studentId1) = await GetAuthenticatedClientAndId("Student");
            var (_, _, studentId2) = await GetAuthenticatedClientAndId("Student");

            var classId = await SeedClassAsync(teacherId);
            await SeedEnrollmentAsync(classId, studentId1);
            await SeedEnrollmentAsync(classId, studentId2);

            var request = new[]
            {
                new { StudentId = studentId1, Status = "Present" },
                new { StudentId = studentId2, Status = "Absent" }
            };

            var response = await client.PostAsJsonAsync($"/api/teacher/classes/{classId}/attendance", request);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var attendance1 = await db.Attendances.FirstOrDefaultAsync(a => a.ClassId == classId && a.StudentId == studentId1);
            var attendance2 = await db.Attendances.FirstOrDefaultAsync(a => a.ClassId == classId && a.StudentId == studentId2);

            Assert.NotNull(attendance1);
            Assert.Equal("Present", attendance1.Status);
            
            Assert.NotNull(attendance2);
            Assert.Equal("Absent", attendance2.Status);
        }

        [Fact]
        public async Task CA_UT_02_MarkAttendanceWithEmptyPayload_ReturnsBadRequest()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId);

            var request = Array.Empty<object>();

            var response = await client.PostAsJsonAsync($"/api/teacher/classes/{classId}/attendance", request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task CA_UT_03_MarkWithInvalidStatus_ReturnsBadRequest()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var (_, _, studentId) = await GetAuthenticatedClientAndId("Student");

            var classId = await SeedClassAsync(teacherId);
            await SeedEnrollmentAsync(classId, studentId);

            var request = new[]
            {
                new { StudentId = studentId, Status = "Tardy" } // Invalid status
            };

            var response = await client.PostAsJsonAsync($"/api/teacher/classes/{classId}/attendance", request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task CA_IT_02_PayloadIncludesNonEnrolledStudentId_AbortsEntireTransaction()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var (_, _, studentId1) = await GetAuthenticatedClientAndId("Student");
            var (_, _, studentId2) = await GetAuthenticatedClientAndId("Student");

            var classId = await SeedClassAsync(teacherId);
            await SeedEnrollmentAsync(classId, studentId1);
            // studentId2 is NOT enrolled

            var request = new[]
            {
                new { StudentId = studentId1, Status = "Present" },
                new { StudentId = studentId2, Status = "Present" } // Invalid
            };

            var response = await client.PostAsJsonAsync($"/api/teacher/classes/{classId}/attendance", request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            // Verify transaction was aborted (student1 shouldn't be saved)
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var anySaved = await db.Attendances.AnyAsync(a => a.ClassId == classId);
            
            Assert.False(anySaved);
        }

        [Fact]
        public async Task CA_IT_03_UpdateExistingAttendanceRecord_UpdatesRowDoesNotDuplicate()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var (_, _, studentId) = await GetAuthenticatedClientAndId("Student");

            var classId = await SeedClassAsync(teacherId);
            await SeedEnrollmentAsync(classId, studentId);

            // First submission
            var request1 = new[] { new { StudentId = studentId, Status = "Present" } };
            await client.PostAsJsonAsync($"/api/teacher/classes/{classId}/attendance", request1);

            // Second submission (update)
            var request2 = new[] { new { StudentId = studentId, Status = "Absent" } };
            var response = await client.PostAsJsonAsync($"/api/teacher/classes/{classId}/attendance", request2);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var records = await db.Attendances.Where(a => a.ClassId == classId && a.StudentId == studentId).ToListAsync();
            
            Assert.Single(records); // Should only be 1 record
            Assert.Equal("Absent", records[0].Status); // Should be updated
        }
    }
}
