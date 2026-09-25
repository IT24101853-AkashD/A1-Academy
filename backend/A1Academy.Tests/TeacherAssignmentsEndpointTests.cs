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
/// Integration tests for /api/teacher/classes/{id}/assignments - assignment creation with a
/// strict deadline (AA-55).
/// </summary>
public class TeacherAssignmentsEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public TeacherAssignmentsEndpointTests(ApiWebApplicationFactory factory)
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

    private static HttpRequestMessage CreateAssignmentRequest(string token, int classId, DateTime dueAt, string title = "Homework 1")
    {
        var request = Authorized(HttpMethod.Post, $"/api/teacher/classes/{classId}/assignments", token);
        request.Content = JsonContent.Create(new { title, description = "Complete exercises 1-10.", dueAt });
        return request;
    }

    private class AssignmentDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime DueAt { get; set; }
        public int SubmissionCount { get; set; }
    }

    private class SubmissionDetailDto
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string StudentEmail { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    [Fact]
    public async Task CreateAssignment_WithFutureDueDate_CreatesItAndSubmissionCountStartsAtZero()
    {
        // Scenario 1 (AA-55) - the assignment is created successfully.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"teacher.createasg.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Teach", email, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, email, "TeachPass1!");
        var classId = await SeedClassAsync(teacherId, suffix);

        var response = await client.SendAsync(CreateAssignmentRequest(token, classId, DateTime.UtcNow.AddDays(7)));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<AssignmentDto>();
        Assert.Equal(0, created!.SubmissionCount);
    }

    [Fact]
    public async Task CreateAssignment_WithPastDueDate_ReturnsBadRequestAndCreatesNothing()
    {
        // Scenario 2 (AA-55, mirrors AA-43) - a past due date/time is rejected.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"teacher.pastasg.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Teach", email, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, email, "TeachPass1!");
        var classId = await SeedClassAsync(teacherId, suffix);

        var response = await client.SendAsync(CreateAssignmentRequest(token, classId, DateTime.UtcNow.AddDays(-1)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var list = await (await client.SendAsync(Authorized(HttpMethod.Get, $"/api/teacher/classes/{classId}/assignments", token)))
            .Content.ReadFromJsonAsync<List<AssignmentDto>>();
        Assert.Empty(list!);
    }

    [Fact]
    public async Task CreateAssignment_ForAnotherTeachersClass_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var ownerEmail = $"teacher.asgowner.{suffix}@example.com";
        var otherEmail = $"teacher.asgother.{suffix}@example.com";
        var ownerId = await SeedUserAsync("Owner", ownerEmail, "TeachPass1!", "Teacher");
        await SeedUserAsync("Other", otherEmail, "TeachPass1!", "Teacher");
        var otherToken = await LoginAsync(client, otherEmail, "TeachPass1!");
        var classId = await SeedClassAsync(ownerId, suffix);

        var response = await client.SendAsync(CreateAssignmentRequest(otherToken, classId, DateTime.UtcNow.AddDays(7)));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetSubmissions_ReturnsSubmissionsWithStatusAndStudentInfo()
    {
        // Story 13 / Scenario 1 - lets teachers easily spot overdue work with Late/Submitted tags.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherEmail = $"teacher.sub.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Teach", teacherEmail, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, teacherEmail, "TeachPass1!");
        var classId = await SeedClassAsync(teacherId, suffix);

        var studentAId = await SeedUserAsync("Alice", $"student.a.{suffix}@example.com", "StuPass1!", "Student");
        var studentBId = await SeedUserAsync("Bob", $"student.b.{suffix}@example.com", "StuPass1!", "Student");

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var assignment = new Assignment
        {
            ClassId = classId,
            Title = "Math Task",
            Description = "Do questions 1-5",
            DueAt = DateTime.UtcNow.AddHours(2),
        };
        context.Assignments.Add(assignment);
        await context.SaveChangesAsync();

        context.AssignmentSubmissions.AddRange(
            new AssignmentSubmission
            {
                AssignmentId = assignment.Id,
                StudentId = studentAId,
                FileName = "alice.pdf",
                ContentType = "application/pdf",
                Content = new byte[] { 1, 2, 3 },
                Status = SubmissionStatus.Submitted,
                SubmittedAt = DateTime.UtcNow.AddHours(-1),
            },
            new AssignmentSubmission
            {
                AssignmentId = assignment.Id,
                StudentId = studentBId,
                FileName = "bob.pdf",
                ContentType = "application/pdf",
                Content = new byte[] { 4, 5, 6 },
                Status = SubmissionStatus.Late,
                SubmittedAt = DateTime.UtcNow.AddMinutes(5),
            }
        );
        await context.SaveChangesAsync();

        var response = await client.SendAsync(Authorized(HttpMethod.Get, $"/api/teacher/classes/{classId}/assignments/{assignment.Id}/submissions", token));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var submissions = await response.Content.ReadFromJsonAsync<List<SubmissionDetailDto>>();
        Assert.NotNull(submissions);
        Assert.Equal(2, submissions.Count);
        Assert.Contains(submissions, s => s.StudentId == studentAId && s.Status == "Submitted");
        Assert.Contains(submissions, s => s.StudentId == studentBId && s.Status == "Late");
    }

    [Fact]
    public async Task DownloadSubmission_ByOwningTeacher_ReturnsFileBytes()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherEmail = $"teacher.dlsub.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Teach", teacherEmail, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, teacherEmail, "TeachPass1!");
        var classId = await SeedClassAsync(teacherId, suffix);
        var studentId = await SeedUserAsync("Alice", $"student.dl.{suffix}@example.com", "StuPass1!", "Student");

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var assignment = new Assignment
        {
            ClassId = classId,
            Title = "Math Task",
            Description = "Task",
            DueAt = DateTime.UtcNow.AddDays(1),
        };
        context.Assignments.Add(assignment);
        await context.SaveChangesAsync();

        var submission = new AssignmentSubmission
        {
            AssignmentId = assignment.Id,
            StudentId = studentId,
            FileName = "alice.pdf",
            ContentType = "application/pdf",
            Content = new byte[] { 9, 8, 7 },
            Status = SubmissionStatus.Submitted,
        };
        context.AssignmentSubmissions.Add(submission);
        await context.SaveChangesAsync();

        var response = await client.SendAsync(Authorized(HttpMethod.Get, $"/api/teacher/classes/{classId}/assignments/{assignment.Id}/submissions/{submission.Id}/download", token));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal(new byte[] { 9, 8, 7 }, bytes);
    }
}
