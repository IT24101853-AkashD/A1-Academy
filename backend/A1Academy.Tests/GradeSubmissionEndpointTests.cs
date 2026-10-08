using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;
using A1Academy.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace A1Academy.Tests;

/// <summary>
/// Integration tests for PATCH /api/teacher/classes/{classId}/assignments/{assignmentId}/submissions/{submissionId}/grade:
/// a teacher grades (0-100) and comments on a submission in a class they own, and nobody else can.
/// </summary>
public class GradeSubmissionEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public GradeSubmissionEndpointTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private record Seeded(int ClassId, int AssignmentId, int SubmissionId, string OwnerEmail, string StudentEmail);

    private const string Password = "GradePass1!";

    private async Task<int> SeedUserAsync(AppDbContext context, string role, string email)
    {
        var user = new User
        {
            FirstName = role,
            Email = email,
            Role = role,
            AuthProvider = "Local",
            IsEmailVerified = true,
            AccountStatus = AccountStatus.Active,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password)
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.Id;
    }

    // A teacher's class with one assignment and one student submission.
    private async Task<Seeded> SeedSubmissionAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var ownerEmail = $"grader.{suffix}@example.com";
        var teacherId = await SeedUserAsync(context, "Teacher", ownerEmail);
        var studentEmail = $"gradee.{suffix}@example.com";
        var studentId = await SeedUserAsync(context, "Student", studentEmail);

        var category = new Category { Name = $"Physics-{suffix}", Description = "Seeded." };
        context.Categories.Add(category);
        await context.SaveChangesAsync();

        var targetClass = new Class
        {
            Name = "Mechanics",
            CategoryId = category.Id,
            TeacherId = teacherId,
            ScheduledAt = DateTime.UtcNow.AddDays(1),
            Capacity = 10,
        };
        context.Classes.Add(targetClass);
        await context.SaveChangesAsync();

        context.Enrollments.Add(new Enrollment { ClassId = targetClass.Id, StudentId = studentId });
        await context.SaveChangesAsync();

        var assignment = new Assignment
        {
            ClassId = targetClass.Id,
            Title = "Lab report",
            Description = "Write it up.",
            DueAt = DateTime.UtcNow.AddDays(3),
        };
        context.Assignments.Add(assignment);
        await context.SaveChangesAsync();

        var submission = new AssignmentSubmission
        {
            AssignmentId = assignment.Id,
            StudentId = studentId,
            FileName = "report.pdf",
            ContentType = "application/pdf",
            Content = new byte[] { 1, 2, 3 },
            FileSizeBytes = 3,
        };
        context.AssignmentSubmissions.Add(submission);
        await context.SaveChangesAsync();

        return new Seeded(targetClass.Id, assignment.Id, submission.Id, ownerEmail, studentEmail);
    }

    private async Task<string> LoginAsync(HttpClient client, string email)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password = Password });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        return body.GetProperty("token").GetString()!;
    }

    private static HttpRequestMessage GradeRequest(Seeded s, string? token, object body, int? submissionId = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Patch,
            $"/api/teacher/classes/{s.ClassId}/assignments/{s.AssignmentId}/submissions/{submissionId ?? s.SubmissionId}/grade")
        {
            Content = JsonContent.Create(body)
        };
        if (token != null)
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
        return request;
    }

    private async Task<AssignmentSubmission> ReloadAsync(int submissionId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await context.AssignmentSubmissions.AsNoTracking().SingleAsync(x => x.Id == submissionId);
    }

    [Fact]
    public async Task Grade_AsOwningTeacher_SavesGradeAndFeedback()
    {
        var seeded = await SeedSubmissionAsync();
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, seeded.OwnerEmail);

        var response = await client.SendAsync(GradeRequest(seeded, token, new { grade = 87, feedback = "Clear method, check units." }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = await ReloadAsync(seeded.SubmissionId);
        Assert.Equal(87, saved.Grade);
        Assert.Equal("Clear method, check units.", saved.Feedback);
    }

    private class StudentAssignmentDto
    {
        public int Id { get; set; }
        public string? MySubmissionStatus { get; set; }
        public int? Grade { get; set; }
        public string? Feedback { get; set; }
    }

    [Fact]
    public async Task GradedSubmission_IsShownToTheStudentWithFeedback()
    {
        var seeded = await SeedSubmissionAsync();
        var client = _factory.CreateClient();
        var studentToken = await LoginAsync(client, seeded.StudentEmail);
        var listUrl = $"/api/student/classes/{seeded.ClassId}/assignments";

        // Before grading: the submission is listed, but with no grade yet.
        var before = await client.SendAsync(new HttpRequestMessage(HttpMethod.Get, listUrl)
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", studentToken) }
        });
        var beforeItem = Assert.Single((await before.Content.ReadFromJsonAsync<List<StudentAssignmentDto>>())!);
        Assert.Equal("Submitted", beforeItem.MySubmissionStatus);
        Assert.Null(beforeItem.Grade);

        var teacherToken = await LoginAsync(client, seeded.OwnerEmail);
        (await client.SendAsync(GradeRequest(seeded, teacherToken, new { grade = 92, feedback = "Excellent analysis." })))
            .EnsureSuccessStatusCode();

        var after = await client.SendAsync(new HttpRequestMessage(HttpMethod.Get, listUrl)
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", studentToken) }
        });
        Assert.Equal(HttpStatusCode.OK, after.StatusCode);
        var afterItem = Assert.Single((await after.Content.ReadFromJsonAsync<List<StudentAssignmentDto>>())!);
        Assert.Equal(seeded.AssignmentId, afterItem.Id);
        Assert.Equal(92, afterItem.Grade);
        Assert.Equal("Excellent analysis.", afterItem.Feedback);
    }

    [Fact]
    public async Task Grade_ForAnotherTeachersClass_ReturnsNotFoundAndChangesNothing()
    {
        var seeded = await SeedSubmissionAsync();
        var otherTeacherEmail = $"other.teacher.{Guid.NewGuid():N}@example.com";
        using (var scope = _factory.Services.CreateScope())
        {
            await SeedUserAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>(), "Teacher", otherTeacherEmail);
        }
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, otherTeacherEmail);

        var response = await client.SendAsync(GradeRequest(seeded, token, new { grade = 10 }));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Null((await ReloadAsync(seeded.SubmissionId)).Grade);
    }

    [Fact]
    public async Task Grade_UnknownSubmission_ReturnsNotFound()
    {
        var seeded = await SeedSubmissionAsync();
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, seeded.OwnerEmail);

        var response = await client.SendAsync(GradeRequest(seeded, token, new { grade = 50 }, submissionId: 987654));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public async Task Grade_OutsideZeroToHundred_ReturnsBadRequest(int grade)
    {
        var seeded = await SeedSubmissionAsync();
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, seeded.OwnerEmail);

        var response = await client.SendAsync(GradeRequest(seeded, token, new { grade }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Null((await ReloadAsync(seeded.SubmissionId)).Grade);
    }

    [Fact]
    public async Task Grade_WithoutToken_ReturnsUnauthorized()
    {
        var seeded = await SeedSubmissionAsync();

        var response = await _factory.CreateClient().SendAsync(GradeRequest(seeded, null, new { grade = 70 }));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
