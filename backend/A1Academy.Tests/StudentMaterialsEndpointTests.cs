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
/// Integration tests for /api/student/classes/{id}/materials - download access restricted to
/// enrolled Students only (AA-53, AA-54).
/// </summary>
public class StudentMaterialsEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public StudentMaterialsEndpointTests(ApiWebApplicationFactory factory)
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

    private async Task<(int classId, int materialId)> SeedClassWithMaterialAsync(int teacherId, string suffix)
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

        var material = new StudyMaterial
        {
            ClassId = targetClass.Id,
            FileName = "notes.pdf",
            ContentType = "application/pdf",
            Content = new byte[] { 1, 2, 3 },
            FileSizeBytes = 3,
            UploadedByTeacherId = teacherId,
        };
        context.StudyMaterials.Add(material);
        await context.SaveChangesAsync();

        return (targetClass.Id, material.Id);
    }

    private async Task EnrollAsync(int classId, int studentId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Enrollments.Add(new Enrollment { ClassId = classId, StudentId = studentId });
        var targetClass = await context.Classes.FindAsync(classId);
        targetClass!.EnrolledCount++;
        await context.SaveChangesAsync();
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

    [Fact]
    public async Task Download_AsEnrolledStudent_ReturnsTheFile()
    {
        // Scenario 1 (AA-53) - an enrolled Student can download the file.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var studentEmail = $"student.download.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Teach", $"teacher.download.{suffix}@example.com", "TeachPass1!", "Teacher");
        var studentId = await SeedUserAsync("Stu", studentEmail, "StuPass1!", "Student");
        var studentToken = await LoginAsync(client, studentEmail, "StuPass1!");
        var (classId, materialId) = await SeedClassWithMaterialAsync(teacherId, suffix);
        await EnrollAsync(classId, studentId);

        var response = await client.SendAsync(Authorized(HttpMethod.Get, $"/api/student/classes/{classId}/materials/{materialId}/download", studentToken));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal(new byte[] { 1, 2, 3 }, bytes);
    }

    [Fact]
    public async Task Download_AsNonEnrolledStudent_ReturnsForbidden()
    {
        // Scenario 2 (AA-54) - direct API access is strictly denied with 403, not 404.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var studentEmail = $"student.notenrolled.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Teach", $"teacher.notenrolled.{suffix}@example.com", "TeachPass1!", "Teacher");
        await SeedUserAsync("Stu", studentEmail, "StuPass1!", "Student");
        var studentToken = await LoginAsync(client, studentEmail, "StuPass1!");
        var (classId, materialId) = await SeedClassWithMaterialAsync(teacherId, suffix);

        var response = await client.SendAsync(Authorized(HttpMethod.Get, $"/api/student/classes/{classId}/materials/{materialId}/download", studentToken));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetMaterials_AsNonEnrolledStudent_ReturnsForbidden()
    {
        // Scenario 1 (AA-54) - the list itself is denied server-side too, not just hidden client-side.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var studentEmail = $"student.listdenied.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Teach", $"teacher.listdenied.{suffix}@example.com", "TeachPass1!", "Teacher");
        await SeedUserAsync("Stu", studentEmail, "StuPass1!", "Student");
        var studentToken = await LoginAsync(client, studentEmail, "StuPass1!");
        var (classId, _) = await SeedClassWithMaterialAsync(teacherId, suffix);

        var response = await client.SendAsync(Authorized(HttpMethod.Get, $"/api/student/classes/{classId}/materials", studentToken));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
