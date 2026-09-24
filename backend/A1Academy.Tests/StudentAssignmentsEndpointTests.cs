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
/// Integration tests for /api/student/classes/{id}/assignments - submission and automatic late
/// flagging (AA-56, AA-57).
/// </summary>
public class StudentAssignmentsEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public StudentAssignmentsEndpointTests(ApiWebApplicationFactory factory)
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

    private async Task<(int classId, int assignmentId)> SeedClassWithAssignmentAsync(int teacherId, string suffix, DateTime dueAt)
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

        // Seeded directly rather than through the Teacher's create endpoint, since that endpoint
        // rejects a past DueAt by design (AA-55) - this test needs one to exercise the late-flag
        // comparison itself, not assignment creation.
        var assignment = new Assignment
        {
            ClassId = targetClass.Id,
            Title = "Homework 1",
            Description = "Complete exercises 1-10.",
            DueAt = dueAt,
        };
        context.Assignments.Add(assignment);
        await context.SaveChangesAsync();

        return (targetClass.Id, assignment.Id);
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

    private static HttpRequestMessage SubmitRequest(string token, int classId, int assignmentId, string fileName = "homework.pdf")
    {
        var request = Authorized(HttpMethod.Post, $"/api/student/classes/{classId}/assignments/{assignmentId}/submissions", token);
        var multipart = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 1, 2, 3 });
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        multipart.Add(fileContent, "file", fileName);
        request.Content = multipart;
        return request;
    }

    private class AssignmentDto
    {
        public int Id { get; set; }
        public string? MySubmissionStatus { get; set; }
    }

    [Fact]
    public async Task Submit_BeforeDeadline_IsRecordedAsSubmitted()
    {
        // Scenario 1 (AA-56) - on-time submission is recorded as Submitted.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var studentEmail = $"student.ontime.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Teach", $"teacher.ontime.{suffix}@example.com", "TeachPass1!", "Teacher");
        var studentId = await SeedUserAsync("Stu", studentEmail, "StuPass1!", "Student");
        var studentToken = await LoginAsync(client, studentEmail, "StuPass1!");
        var (classId, assignmentId) = await SeedClassWithAssignmentAsync(teacherId, suffix, DateTime.UtcNow.AddDays(3));
        await EnrollAsync(classId, studentId);

        var response = await client.SendAsync(SubmitRequest(studentToken, classId, assignmentId));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<AssignmentDto>();
        Assert.Equal("Submitted", result!.MySubmissionStatus);
    }

    [Fact]
    public async Task Submit_AfterDeadline_IsAutomaticallyFlaggedLate()
    {
        // AA-57 - the exact submission timestamp compared against the deadline flags it Late.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var studentEmail = $"student.late.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Teach", $"teacher.late.{suffix}@example.com", "TeachPass1!", "Teacher");
        var studentId = await SeedUserAsync("Stu", studentEmail, "StuPass1!", "Student");
        var studentToken = await LoginAsync(client, studentEmail, "StuPass1!");
        var (classId, assignmentId) = await SeedClassWithAssignmentAsync(teacherId, suffix, DateTime.UtcNow.AddMinutes(-5));
        await EnrollAsync(classId, studentId);

        var response = await client.SendAsync(SubmitRequest(studentToken, classId, assignmentId));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<AssignmentDto>();
        Assert.Equal("Late", result!.MySubmissionStatus);
    }

    [Fact]
    public async Task Submit_Twice_ReturnsConflictOnSecondAttempt()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var studentEmail = $"student.resubmit.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Teach", $"teacher.resubmit.{suffix}@example.com", "TeachPass1!", "Teacher");
        var studentId = await SeedUserAsync("Stu", studentEmail, "StuPass1!", "Student");
        var studentToken = await LoginAsync(client, studentEmail, "StuPass1!");
        var (classId, assignmentId) = await SeedClassWithAssignmentAsync(teacherId, suffix, DateTime.UtcNow.AddDays(3));
        await EnrollAsync(classId, studentId);

        await client.SendAsync(SubmitRequest(studentToken, classId, assignmentId));
        var second = await client.SendAsync(SubmitRequest(studentToken, classId, assignmentId));

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Submit_AsNonEnrolledStudent_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var studentEmail = $"student.notenrolledasg.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Teach", $"teacher.notenrolledasg.{suffix}@example.com", "TeachPass1!", "Teacher");
        await SeedUserAsync("Stu", studentEmail, "StuPass1!", "Student");
        var studentToken = await LoginAsync(client, studentEmail, "StuPass1!");
        var (classId, assignmentId) = await SeedClassWithAssignmentAsync(teacherId, suffix, DateTime.UtcNow.AddDays(3));

        var response = await client.SendAsync(SubmitRequest(studentToken, classId, assignmentId));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
