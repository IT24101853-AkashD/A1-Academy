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
    public class SecurityAndConcurrencyTests : IClassFixture<ApiWebApplicationFactory>
    {
        private readonly ApiWebApplicationFactory _factory;

        public SecurityAndConcurrencyTests(ApiWebApplicationFactory factory)
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

        private async Task<int> SeedClassAsync(int teacherId, int capacity = 30)
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
                Status = ClassStatus.Active,
                EnrolledCount = 0
            };
            db.Classes.Add(newClass);
            await db.SaveChangesAsync();
            return newClass.Id;
        }

        [Fact]
        public async Task SEC_01_ProtectedEndpointWithoutJwt_ReturnsUnauthorized()
        {
            var client = _factory.CreateClient();
            var response = await client.GetAsync("/api/users/me");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task SEC_02_ExpiredOrInvalidJwt_ReturnsUnauthorized()
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "invalid.jwt.token");
            var response = await client.GetAsync("/api/users/me");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task SEC_03_TeacherEndpointAccessedByStudent_ReturnsForbidden()
        {
            var (client, _, _) = await GetAuthenticatedClientAndId("Student");
            var request = new { Name = "Test", CategoryId = 1, ScheduledAt = DateTime.UtcNow.AddDays(1), Capacity = 30 };
            var response = await client.PostAsJsonAsync("/api/teacher/classes", request);
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task SEC_04_TeacherAccessesAnotherTeachersClass_ReturnsNotFound()
        {
            var (clientA, _, teacherIdA) = await GetAuthenticatedClientAndId("Teacher");
            var (clientB, _, teacherIdB) = await GetAuthenticatedClientAndId("Teacher");
            
            var classIdA = await SeedClassAsync(teacherIdA);

            var response = await clientB.PostAsync($"/api/teacher/classes/{classIdA}/cancel", null);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task SEC_05_IDManipulationAttempt_UsesTokenIdentity()
        {
            var (client, _, studentId) = await GetAuthenticatedClientAndId("Student");
            var (_, _, maliciousTargetId) = await GetAuthenticatedClientAndId("Student");
            
            // The endpoint /api/users/me doesn't take an ID in the path/payload, it extracts it from the JWT.
            // If they try to pass an ID via query string or body when it's not expected, it is ignored.
            var response = await client.GetAsync($"/api/users/me?id={maliciousTargetId}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            
            var body = await response.Content.ReadAsStringAsync();
            
            // Should return data for studentId, not maliciousTargetId
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var expectedEmail = (await db.Users.FindAsync(studentId))!.Email;
            
            Assert.Contains(expectedEmail, body);
        }

        [Fact]
        public async Task DB_01_ConcurrentEnrolment_WithOneSeatLeft_SequentializesProperly()
        {
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId, 1); // Capacity is exactly 1

            var (client1, _, _) = await GetAuthenticatedClientAndId("Student");
            var (client2, _, _) = await GetAuthenticatedClientAndId("Student");

            // Fire both requests at the exact same time
            var task1 = client1.PostAsync($"/api/student/classes/{classId}/enroll", null);
            var task2 = client2.PostAsync($"/api/student/classes/{classId}/enroll", null);

            var responses = await Task.WhenAll(task1, task2);

            // One should succeed (200 OK) and one should fail (409 Conflict)
            var successes = responses.Count(r => r.StatusCode == HttpStatusCode.OK);
            var conflicts = responses.Count(r => r.StatusCode == HttpStatusCode.Conflict);

            Assert.Equal(1, successes);
            Assert.Equal(1, conflicts);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var targetClass = await db.Classes.FindAsync(classId);
            Assert.Equal(1, targetClass!.EnrolledCount); // Enrolled count should remain exactly 1
        }
    }
}
