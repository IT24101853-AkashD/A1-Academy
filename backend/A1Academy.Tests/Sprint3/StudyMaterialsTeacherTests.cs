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
    public class StudyMaterialsTeacherTests : IClassFixture<ApiWebApplicationFactory>
    {
        private readonly ApiWebApplicationFactory _factory;

        public StudyMaterialsTeacherTests(ApiWebApplicationFactory factory)
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
        public async Task SM_UT_01_And_IT_01_UploadValidDocument_PersistsSuccessfully()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId);

            var formData = CreateFileContent("valid_document.pdf", "application/pdf", 1024);
            var response = await client.PostAsync($"/api/teacher/classes/{classId}/materials", formData);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var material = await db.StudyMaterials.FirstOrDefaultAsync(m => m.ClassId == classId);
            Assert.NotNull(material);
            Assert.Equal("valid_document.pdf", material.FileName);
        }

        [Fact]
        public async Task SM_UT_02_UploadFileGreaterThan10MB_ReturnsBadRequest()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId);

            var formData = CreateFileContent("large_document.pdf", "application/pdf", (10 * 1024 * 1024) + 1); // 10MB + 1 byte
            var response = await client.PostAsync($"/api/teacher/classes/{classId}/materials", formData);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task SM_UT_03_UploadUnsupportedFileType_ReturnsBadRequest()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId);

            var formData = CreateFileContent("malware.exe", "application/x-msdownload", 1024);
            var response = await client.PostAsync($"/api/teacher/classes/{classId}/materials", formData);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task SM_UT_04_UploadZeroByteFile_ReturnsBadRequest()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId);

            var formData = CreateFileContent("empty.pdf", "application/pdf", 0);
            var response = await client.PostAsync($"/api/teacher/classes/{classId}/materials", formData);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task SM_UT_05_UploadWithPathTraversalFilename_IsSanitizedOrRejected()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId);

            var formData = CreateFileContent("../../../windows/system32/hack.pdf", "application/pdf", 1024);
            var response = await client.PostAsync($"/api/teacher/classes/{classId}/materials", formData);

            // API should either sanitize the filename (returning OK) or reject it outright (BadRequest).
            Assert.True(response.StatusCode == HttpStatusCode.OK || response.StatusCode == HttpStatusCode.BadRequest);

            if (response.StatusCode == HttpStatusCode.OK)
            {
                using var scope = _factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var material = await db.StudyMaterials.FirstOrDefaultAsync(m => m.ClassId == classId);
                Assert.NotNull(material);
                Assert.DoesNotContain("..", material.FileName);
            }
        }

        [Fact]
        public async Task SM_UT_06_And_IT_03_DeleteOwnMaterial_RemovesFromDB()
        {
            var (client, _, teacherId) = await GetAuthenticatedClientAndId("Teacher");
            var classId = await SeedClassAsync(teacherId);
            var materialId = await SeedMaterialAsync(classId, teacherId);

            var response = await client.DeleteAsync($"/api/teacher/classes/{classId}/materials/{materialId}");

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var material = await db.StudyMaterials.FindAsync(materialId);
            Assert.Null(material);
        }

        [Fact]
        public async Task SM_IT_02_UploadToAnotherTeachersClass_ReturnsNotFound()
        {
            var (clientA, _, teacherIdA) = await GetAuthenticatedClientAndId("Teacher");
            var (clientB, _, teacherIdB) = await GetAuthenticatedClientAndId("Teacher");
            
            var classIdA = await SeedClassAsync(teacherIdA);

            var formData = CreateFileContent("document.pdf", "application/pdf", 1024);
            var response = await clientB.PostAsync($"/api/teacher/classes/{classIdA}/materials", formData);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }
}
