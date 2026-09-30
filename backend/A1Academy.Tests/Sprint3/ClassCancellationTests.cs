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
    public class ClassCancellationTests : IClassFixture<ApiWebApplicationFactory>
    {
        private readonly ApiWebApplicationFactory _factory;

        public ClassCancellationTests(ApiWebApplicationFactory factory)
        {
            _factory = factory;
        }

        private async Task SeedUserAsync(string firstName, string lastName, string email, string password, string role, string accountStatus = AccountStatus.Active)
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
                AccountStatus = accountStatus,
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
            
            // Get user ID
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.SingleAsync(u => u.Email == email);
            return (client, token, user.Id);
        }

        private async Task<int> SeedClassAsync(int teacherId, string status = ClassStatus.Active)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            var category = new Category { Name = "Science " + Guid.NewGuid(), Description = "Test" };
            db.Categories.Add(category);
            await db.SaveChangesAsync();

            var newClass = new Class
            {
                Name = "Test Class",
                CategoryId = category.Id,
                TeacherId = teacherId,
                ScheduledAt = DateTime.UtcNow.AddDays(2),
                Capacity = 30,
                Status = status
            };
            db.Classes.Add(newClass);
            await db.SaveChangesAsync();

            return newClass.Id;
        }

        [Fact]
        public async Task CC_UT_01_CancelOwnActiveClass_ReturnsOk()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId);

            var response = await client.PostAsync($"/api/teacher/classes/{classId}/cancel", null);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task CC_IT_01_CancelOwnActiveClass_UpdatesDBToCancelled()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId);

            await client.PostAsync($"/api/teacher/classes/{classId}/cancel", null);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var cancelledClass = await db.Classes.FindAsync(classId);
            Assert.Equal(ClassStatus.Cancelled, cancelledClass!.Status);
        }

        [Fact]
        public async Task CC_UT_02_CancelAlreadyCancelledClass_ReturnsConflict()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId, ClassStatus.Cancelled);

            var response = await client.PostAsync($"/api/teacher/classes/{classId}/cancel", null);
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        }

        [Fact]
        public async Task CC_UT_03_CancelAnotherTeachersClass_ReturnsNotFound()
        {
            var (clientA, _, teacherIdA) = await GetAuthenticatedClientAndId("Teacher");
            var (clientB, _, teacherIdB) = await GetAuthenticatedClientAndId("Teacher");
            
            var classIdOwnedByA = await SeedClassAsync(teacherIdA);

            var response = await clientB.PostAsync($"/api/teacher/classes/{classIdOwnedByA}/cancel", null);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task CC_IT_02_CancelAnotherTeachersClass_DBRemainsUnchanged()
        {
            var (clientA, _, teacherIdA) = await GetAuthenticatedClientAndId("Teacher");
            var (clientB, _, teacherIdB) = await GetAuthenticatedClientAndId("Teacher");
            
            var classIdOwnedByA = await SeedClassAsync(teacherIdA, ClassStatus.Active);

            await clientB.PostAsync($"/api/teacher/classes/{classIdOwnedByA}/cancel", null);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var unchangedClass = await db.Classes.FindAsync(classIdOwnedByA);
            Assert.Equal(ClassStatus.Active, unchangedClass!.Status);
        }
    }
}
