using System.Linq;
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
    public class ClassSchedulingTests : IClassFixture<ApiWebApplicationFactory>
    {
        private readonly ApiWebApplicationFactory _factory;

        public ClassSchedulingTests(ApiWebApplicationFactory factory)
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

        private async Task<(HttpClient client, string token)> GetAuthenticatedClient(string role)
        {
            var client = _factory.CreateClient();
            var email = $"{role.ToLower()}.{Guid.NewGuid():N}@example.com";
            await SeedUserAsync("Test", role, email, "Password123!", role);
            var token = await LoginAsync(client, email, "Password123!");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return (client, token);
        }

        private async Task<int> SeedCategoryAsync()
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var cat = new Category { Name = "Science " + Guid.NewGuid(), Description = "Test" };
            context.Categories.Add(cat);
            await context.SaveChangesAsync();
            return cat.Id;
        }

        [Fact]
        public async Task CS_IT_01_ValidScheduling_CreatesClass()
        {
            var (client, _) = await GetAuthenticatedClient("Teacher");
            var categoryId = await SeedCategoryAsync();

            var request = new { Name = "Physics 101", CategoryId = categoryId, ScheduledAt = DateTime.UtcNow.AddDays(2), Capacity = 30 };
            var response = await client.PostAsJsonAsync("/api/teacher/classes", request);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains("Physics 101", body);
        }

        [Fact]
        public async Task CS_UT_02_ScheduleExactlyAtCurrentUtcTime_ReturnsBadRequest()
        {
            var (client, _) = await GetAuthenticatedClient("Teacher");
            var categoryId = await SeedCategoryAsync();

            var request = new { Name = "Now Class", CategoryId = categoryId, ScheduledAt = DateTime.UtcNow, Capacity = 30 };
            var response = await client.PostAsJsonAsync("/api/teacher/classes", request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task CS_UT_03_ScheduleInThePast_ReturnsBadRequest()
        {
            var (client, _) = await GetAuthenticatedClient("Teacher");
            var categoryId = await SeedCategoryAsync();

            var request = new { Name = "Past Class", CategoryId = categoryId, ScheduledAt = DateTime.UtcNow.AddDays(-1), Capacity = 30 };
            var response = await client.PostAsJsonAsync("/api/teacher/classes", request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task CS_UT_04_ScheduleWithWhitespaceName_ReturnsBadRequest()
        {
            var (client, _) = await GetAuthenticatedClient("Teacher");
            var categoryId = await SeedCategoryAsync();

            var request = new { Name = "   ", CategoryId = categoryId, ScheduledAt = DateTime.UtcNow.AddDays(1), Capacity = 30 };
            var response = await client.PostAsJsonAsync("/api/teacher/classes", request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task CS_UT_05_ScheduleNameTooLong_ReturnsBadRequest()
        {
            var (client, _) = await GetAuthenticatedClient("Teacher");
            var categoryId = await SeedCategoryAsync();

            var request = new { Name = new string('A', 101), CategoryId = categoryId, ScheduledAt = DateTime.UtcNow.AddDays(1), Capacity = 30 };
            var response = await client.PostAsJsonAsync("/api/teacher/classes", request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task CS_UT_06_ScheduleZeroCapacity_ReturnsBadRequest()
        {
            var (client, _) = await GetAuthenticatedClient("Teacher");
            var categoryId = await SeedCategoryAsync();

            var request = new { Name = "Zero Cap", CategoryId = categoryId, ScheduledAt = DateTime.UtcNow.AddDays(1), Capacity = 0 };
            var response = await client.PostAsJsonAsync("/api/teacher/classes", request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task CS_IT_02_InvalidCategoryId_ReturnsBadRequest()
        {
            var (client, _) = await GetAuthenticatedClient("Teacher");

            var request = new { Name = "Bad Cat", CategoryId = 999999, ScheduledAt = DateTime.UtcNow.AddDays(1), Capacity = 30 };
            var response = await client.PostAsJsonAsync("/api/teacher/classes", request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task CS_IT_03_StudentAttemptsScheduling_ReturnsForbidden()
        {
            var (client, _) = await GetAuthenticatedClient("Student");
            var categoryId = await SeedCategoryAsync();

            var request = new { Name = "Student Class", CategoryId = categoryId, ScheduledAt = DateTime.UtcNow.AddDays(1), Capacity = 30 };
            var response = await client.PostAsJsonAsync("/api/teacher/classes", request);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task CS_IT_04_UnauthenticatedRequest_ReturnsUnauthorized()
        {
            var client = _factory.CreateClient();
            var categoryId = await SeedCategoryAsync();

            var request = new { Name = "No Auth", CategoryId = categoryId, ScheduledAt = DateTime.UtcNow.AddDays(1), Capacity = 30 };
            var response = await client.PostAsJsonAsync("/api/teacher/classes", request);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
    }
}
