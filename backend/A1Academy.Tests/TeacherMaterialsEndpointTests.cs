using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;
using A1Academy.Tests.Fixtures;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace A1Academy.Tests;

/// <summary>
/// Integration tests for /api/teacher/classes/{id}/materials - study material upload, listing,
/// and deletion (AA-52, AA-84, AA-86).
/// </summary>
public class TeacherMaterialsEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public TeacherMaterialsEndpointTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<int> SeedUserAsync(string firstName, string email, string password, string role)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User
        {
            FirstName = firstName,
            Email = email,
            Role = role,
            AuthProvider = "Local",
            IsEmailVerified = true,
            AccountStatus = AccountStatus.Active,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.Id;
    }

    private async Task<int> SeedClassAsync(int teacherId, string suffix)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var category = new Category { Name = $"Mathematics-{suffix}", Description = "Seeded." };
        context.Categories.Add(category);
        await context.SaveChangesAsync();

        var targetClass = new Class
        {
            Name = "Algebra Basics",
            CategoryId = category.Id,
            TeacherId = teacherId,
            ScheduledAt = DateTime.UtcNow.AddDays(1),
            Capacity = 10,
        };
        context.Classes.Add(targetClass);
        await context.SaveChangesAsync();
        return targetClass.Id;
    }

    private async Task<string> LoginAsync(HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        return body.GetProperty("token").GetString()!;
    }

    private static HttpRequestMessage Authorized(HttpMethod method, string url, string token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    private static HttpRequestMessage UploadRequest(string token, int classId, byte[] bytes, string fileName, string contentType)
    {
        var request = Authorized(HttpMethod.Post, $"/api/teacher/classes/{classId}/materials", token);
        var multipart = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        multipart.Add(fileContent, "file", fileName);
        request.Content = multipart;
        return request;
    }

    private class MaterialDto
    {
        public int Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long FileSizeBytes { get; set; }
    }

    [Fact]
    public async Task UploadMaterial_ToOwnClass_SavesAndLinksToClass()
    {
        // Scenario 1 (AA-52) - the uploaded file is saved and linked to the class record.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"teacher.upload.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Teach", email, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, email, "TeachPass1!");
        var classId = await SeedClassAsync(teacherId, suffix);

        var response = await client.SendAsync(UploadRequest(token, classId, new byte[] { 1, 2, 3, 4 }, "notes.pdf", "application/pdf"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var uploaded = await response.Content.ReadFromJsonAsync<MaterialDto>();
        Assert.Equal("notes.pdf", uploaded!.FileName);

        var list = await (await client.SendAsync(Authorized(HttpMethod.Get, $"/api/teacher/classes/{classId}/materials", token)))
            .Content.ReadFromJsonAsync<List<MaterialDto>>();
        Assert.Single(list!);
    }

    [Fact]
    public async Task UploadMaterial_ToAnotherTeachersClass_ReturnsNotFound()
    {
        // AA-84 - only the owning Teacher can upload to a class.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var ownerEmail = $"teacher.matowner.{suffix}@example.com";
        var otherEmail = $"teacher.matother.{suffix}@example.com";
        var ownerId = await SeedUserAsync("Owner", ownerEmail, "TeachPass1!", "Teacher");
        await SeedUserAsync("Other", otherEmail, "TeachPass1!", "Teacher");
        var otherToken = await LoginAsync(client, otherEmail, "TeachPass1!");
        var classId = await SeedClassAsync(ownerId, suffix);

        var response = await client.SendAsync(UploadRequest(otherToken, classId, new byte[] { 1, 2 }, "notes.pdf", "application/pdf"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UploadMaterial_WithUnsupportedType_ReturnsBadRequest()
    {
        // AA-86 - file type validation.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"teacher.badtype.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Teach", email, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, email, "TeachPass1!");
        var classId = await SeedClassAsync(teacherId, suffix);

        var response = await client.SendAsync(UploadRequest(token, classId, new byte[] { 1, 2 }, "virus.exe", "application/x-msdownload"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DeleteMaterial_OwnedByCallingTeacher_RemovesIt()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"teacher.delete.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Teach", email, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, email, "TeachPass1!");
        var classId = await SeedClassAsync(teacherId, suffix);

        var uploaded = await (await client.SendAsync(UploadRequest(token, classId, new byte[] { 1, 2 }, "notes.pdf", "application/pdf")))
            .Content.ReadFromJsonAsync<MaterialDto>();

        var deleteResponse = await client.SendAsync(Authorized(HttpMethod.Delete, $"/api/teacher/classes/{classId}/materials/{uploaded!.Id}", token));
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var list = await (await client.SendAsync(Authorized(HttpMethod.Get, $"/api/teacher/classes/{classId}/materials", token)))
            .Content.ReadFromJsonAsync<List<MaterialDto>>();
        Assert.Empty(list!);
    }
}
