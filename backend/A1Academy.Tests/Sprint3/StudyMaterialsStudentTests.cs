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
    public class StudyMaterialsStudentTests : IClassFixture<ApiWebApplicationFactory>
    {
        private readonly ApiWebApplicationFactory _factory;

        public StudyMaterialsStudentTests(ApiWebApplicationFactory factory)
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

        private async Task<int> SeedMaterialAsync(int classId, int teacherId)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var material = new StudyMaterial
            {
                ClassId = classId,
                FileName = "notes.pdf",
                ContentType = "application/pdf",
                Content = new byte[] { 1, 2, 3, 4 },
                FileSizeBytes = 4,
                UploadedByTeacherId = teacherId
            };
            db.StudyMaterials.Add(material);
            await db.SaveChangesAsync();
            return material.Id;
        }

        [Fact]
        public async Task SMD_UT_01_ViewMaterialsForEnrolledClass_ReturnsMaterialsList()
        {
            var (client, _, studentId) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            
            var classId = await SeedClassAsync(teacherId);
            await SeedEnrollmentAsync(classId, studentId);
            var materialId = await SeedMaterialAsync(classId, teacherId);

            var response = await client.GetAsync($"/api/student/classes/{classId}/materials");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            
            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains("notes.pdf", body);
        }

        [Fact]
        public async Task SMD_UT_02_ViewMaterialsForNonEnrolledClass_ReturnsForbidden()
        {
            var (client, _, _) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            
            var classId = await SeedClassAsync(teacherId);
            await SeedMaterialAsync(classId, teacherId);

            var response = await client.GetAsync($"/api/student/classes/{classId}/materials");
            
            // Expected 403 Forbidden since class exists but student is not enrolled
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task SMD_IT_01_DownloadMaterialAPIEnrolled_StreamsCorrectBytes()
        {
            var (client, _, studentId) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            
            var classId = await SeedClassAsync(teacherId);
            await SeedEnrollmentAsync(classId, studentId);
            var materialId = await SeedMaterialAsync(classId, teacherId);

            var response = await client.GetAsync($"/api/student/classes/{classId}/materials/{materialId}/download");
            
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("application/pdf", response.Content.Headers.ContentType!.MediaType);
            
            var bytes = await response.Content.ReadAsByteArrayAsync();
            Assert.Equal(new byte[] { 1, 2, 3, 4 }, bytes);
        }

        [Fact]
        public async Task SMD_IT_02_DownloadMaterialAPINotEnrolled_ReturnsForbidden()
        {
            var (client, _, _) = await GetAuthenticatedClientAndId("Student");
            var (_, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            
            var classId = await SeedClassAsync(teacherId);
            var materialId = await SeedMaterialAsync(classId, teacherId);

            var response = await client.GetAsync($"/api/student/classes/{classId}/materials/{materialId}/download");
            
            // Expected 403 Forbidden to hide existence of the material from unauthorized users
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }
}
