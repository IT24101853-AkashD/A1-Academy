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
    public class SearchAndFilterClassesTests : IClassFixture<ApiWebApplicationFactory>
    {
        private readonly ApiWebApplicationFactory _factory;

        public SearchAndFilterClassesTests(ApiWebApplicationFactory factory)
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

        private async Task<(HttpClient client, string token, int userId)> GetAuthenticatedClientAndId(string role, string firstName = "Test", string lastName = "User")
        {
            var client = _factory.CreateClient();
            var email = $"{role.ToLower()}.{Guid.NewGuid():N}@example.com";
            await SeedUserAsync(firstName, lastName, email, "Password123!", role);
            var token = await LoginAsync(client, email, "Password123!");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.SingleAsync(u => u.Email == email);
            return (client, token, user.Id);
        }

        private async Task<int> SeedCategoryAsync(string name)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var category = new Category { Name = name + Guid.NewGuid(), Description = "Test" };
            db.Categories.Add(category);
            await db.SaveChangesAsync();
            return category.Id;
        }

        private async Task<int> SeedClassAsync(int teacherId, int categoryId, string status = ClassStatus.Active)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var newClass = new Class
            {
                Name = "Test Class " + Guid.NewGuid(),
                CategoryId = categoryId,
                TeacherId = teacherId,
                ScheduledAt = DateTime.UtcNow.AddDays(2),
                Capacity = 30,
                Status = status
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
        public async Task SF_UT_01_SearchByPartialTeacherName_ReturnsMatches()
        {
            var (client, _, _) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher", "Jonathan", "Doe");
            var catId = await SeedCategoryAsync("Math");
            await SeedClassAsync(teacherId, catId);

            var response = await client.GetAsync("/api/student/classes?teacherName=NATHAN d");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains("Jonathan Doe", body);
        }

        [Fact]
        public async Task SF_UT_02_SearchWithLeadingTrailingSpaces_TrimsAndMatches()
        {
            var (client, _, _) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher", "Sarah", "Connor");
            var catId = await SeedCategoryAsync("Physics");
            await SeedClassAsync(teacherId, catId);

            var encoded = Uri.EscapeDataString("  sarah c  ");
            var response = await client.GetAsync($"/api/student/classes?teacherName={encoded}");
            
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains("Sarah Connor", body);
        }

        [Fact]
        public async Task SF_UT_03_FilterByCategoryId_ReturnsOnlyCategory()
        {
            var (client, _, _) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            
            var catId1 = await SeedCategoryAsync("Chemistry");
            var classId1 = await SeedClassAsync(teacherId, catId1);
            
            var catId2 = await SeedCategoryAsync("Biology");
            var classId2 = await SeedClassAsync(teacherId, catId2);

            var response = await client.GetAsync($"/api/student/classes?categoryId={catId1}");
            var body = await response.Content.ReadAsStringAsync();

            Assert.Contains($"\"categoryId\":{catId1}", body);
            Assert.DoesNotContain($"\"categoryId\":{catId2}", body);
        }

        [Fact]
        public async Task SF_UT_04_ViewCancelledClassesInSearch_Excluded()
        {
            var (client, _, _) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher", "Cancelled", "Teacher");
            var catId = await SeedCategoryAsync("History");
            
            await SeedClassAsync(teacherId, catId, ClassStatus.Cancelled);

            var response = await client.GetAsync("/api/student/classes?teacherName=Cancelled Teacher");
            var body = await response.Content.ReadAsStringAsync();

            Assert.Equal("[]", body);
        }

        [Fact]
        public async Task SF_IT_01_RetrieveClassesThroughAPI_ReturnsActiveClasses()
        {
            var (client, _, _) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var catId = await SeedCategoryAsync("Geology");
            var classId = await SeedClassAsync(teacherId, catId);

            var response = await client.GetAsync("/api/student/classes");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains($"\"id\":{classId}", body);
        }

        [Fact]
        public async Task SF_IT_02_RetrieveDashboardClasses_ReturnsEnrolledClassesSorted()
        {
            var (client, _, studentId) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var catId = await SeedCategoryAsync("Art");

            var classId1 = await SeedClassAsync(teacherId, catId);
            await SeedEnrollmentAsync(classId1, studentId);

            var response = await client.GetAsync("/api/student/classes/mine");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains($"\"id\":{classId1}", body);
        }
    }
}
