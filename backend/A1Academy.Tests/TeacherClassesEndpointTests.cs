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
/// Integration tests for /api/teacher/classes - scheduling (AA-43), cancellation (AA-44), and
/// attendance (AA-62). Same style as TeacherSubjectsEndpointTests.
/// </summary>
public class TeacherClassesEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public TeacherClassesEndpointTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task SeedUserAsync(string firstName, string email, string password, string role)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Users.Add(new User
        {
            FirstName = firstName,
            Email = email,
            Role = role,
            AuthProvider = "Local",
            IsEmailVerified = true,
            AccountStatus = AccountStatus.Active,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
        });
        await context.SaveChangesAsync();
    }

    private async Task<int> SeedCategoryAsync(string name)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var category = new Category { Name = name, Description = "Seeded for TeacherClasses tests." };
        context.Categories.Add(category);
        await context.SaveChangesAsync();
        return category.Id;
    }

    private async Task<int> SeedEnrolledStudentAsync(int classId, string email)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var student = new User
        {
            FirstName = "Stu",
            Email = email,
            Role = "Student",
            AuthProvider = "Local",
            IsEmailVerified = true,
            AccountStatus = AccountStatus.Active,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("StuPass1!")
        };
        context.Users.Add(student);
        await context.SaveChangesAsync();

        context.Enrollments.Add(new Enrollment { ClassId = classId, StudentId = student.Id });
        var targetClass = await context.Classes.FindAsync(classId);
        targetClass!.EnrolledCount++;
        await context.SaveChangesAsync();

        return student.Id;
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

    private static HttpRequestMessage ScheduleRequest(string token, int categoryId, DateTime scheduledAt, int capacity, string name = "Algebra Basics")
    {
        var request = Authorized(HttpMethod.Post, "/api/teacher/classes", token);
        request.Content = JsonContent.Create(new { name, categoryId, scheduledAt, capacity });
        return request;
    }

    private class ClassDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime ScheduledAt { get; set; }
        public int Capacity { get; set; }
        public int EnrolledCount { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    [Fact]
    public async Task ScheduleClass_WithValidFutureDate_CreatesClassAndReturnsIt()
    {
        // Scenario 1 - a valid future date, time, and capacity creates the class successfully.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"teacher.schedule.{suffix}@example.com";
        await SeedUserAsync("Teach", email, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, email, "TeachPass1!");
        var categoryId = await SeedCategoryAsync($"Mathematics-{suffix}");

        var scheduledAt = DateTime.UtcNow.AddDays(3);
        var response = await client.SendAsync(ScheduleRequest(token, categoryId, scheduledAt, 10));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<ClassDto>();
        Assert.Equal("Active", created!.Status);
        Assert.Equal(10, created.Capacity);
        Assert.Equal(0, created.EnrolledCount);
    }

    [Fact]
    public async Task ScheduleClass_WithPastDate_ReturnsBadRequestAndCreatesNothing()
    {
        // Scenario 2 - a past date is strictly rejected.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"teacher.pastdate.{suffix}@example.com";
        await SeedUserAsync("Teach", email, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, email, "TeachPass1!");
        var categoryId = await SeedCategoryAsync($"Mathematics-{suffix}");

        var response = await client.SendAsync(ScheduleRequest(token, categoryId, DateTime.UtcNow.AddDays(-1), 10));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var listResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher/classes", token));
        var list = await listResponse.Content.ReadFromJsonAsync<List<ClassDto>>();
        Assert.Empty(list!);
    }

    [Fact]
    public async Task ScheduleClass_WithZeroCapacity_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"teacher.zerocap.{suffix}@example.com";
        await SeedUserAsync("Teach", email, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, email, "TeachPass1!");
        var categoryId = await SeedCategoryAsync($"Mathematics-{suffix}");

        var response = await client.SendAsync(ScheduleRequest(token, categoryId, DateTime.UtcNow.AddDays(1), 0));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetMyClasses_OnlyReturnsTheCallingTeachersOwnClasses()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var emailA = $"teacher.a.{suffix}@example.com";
        var emailB = $"teacher.b.{suffix}@example.com";
        await SeedUserAsync("TeachA", emailA, "TeachPass1!", "Teacher");
        await SeedUserAsync("TeachB", emailB, "TeachPass1!", "Teacher");
        var tokenA = await LoginAsync(client, emailA, "TeachPass1!");
        var tokenB = await LoginAsync(client, emailB, "TeachPass1!");
        var categoryId = await SeedCategoryAsync($"Mathematics-{suffix}");

        await client.SendAsync(ScheduleRequest(tokenA, categoryId, DateTime.UtcNow.AddDays(1), 10));

        var listA = await (await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher/classes", tokenA)))
            .Content.ReadFromJsonAsync<List<ClassDto>>();
        var listB = await (await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher/classes", tokenB)))
            .Content.ReadFromJsonAsync<List<ClassDto>>();

        Assert.Single(listA!);
        Assert.Empty(listB!);
    }

    [Fact]
    public async Task CancelClass_ByOwningTeacher_UpdatesStatusToCancelled()
    {
        // Scenario 1 (AA-44) - the class's status immediately updates to Cancelled.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"teacher.cancel.{suffix}@example.com";
        await SeedUserAsync("Teach", email, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, email, "TeachPass1!");
        var categoryId = await SeedCategoryAsync($"Mathematics-{suffix}");

        var created = await (await client.SendAsync(ScheduleRequest(token, categoryId, DateTime.UtcNow.AddDays(1), 10)))
            .Content.ReadFromJsonAsync<ClassDto>();

        var cancelResponse = await client.SendAsync(Authorized(HttpMethod.Post, $"/api/teacher/classes/{created!.Id}/cancel", token));

        Assert.Equal(HttpStatusCode.OK, cancelResponse.StatusCode);
        var cancelled = await cancelResponse.Content.ReadFromJsonAsync<ClassDto>();
        Assert.Equal("Cancelled", cancelled!.Status);
    }

    [Fact]
    public async Task CancelClass_ByNonOwningTeacher_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var ownerEmail = $"teacher.owner.{suffix}@example.com";
        var otherEmail = $"teacher.other.{suffix}@example.com";
        await SeedUserAsync("Owner", ownerEmail, "TeachPass1!", "Teacher");
        await SeedUserAsync("Other", otherEmail, "TeachPass1!", "Teacher");
        var ownerToken = await LoginAsync(client, ownerEmail, "TeachPass1!");
        var otherToken = await LoginAsync(client, otherEmail, "TeachPass1!");
        var categoryId = await SeedCategoryAsync($"Mathematics-{suffix}");

        var created = await (await client.SendAsync(ScheduleRequest(ownerToken, categoryId, DateTime.UtcNow.AddDays(1), 10)))
            .Content.ReadFromJsonAsync<ClassDto>();

        var response = await client.SendAsync(Authorized(HttpMethod.Post, $"/api/teacher/classes/{created!.Id}/cancel", otherToken));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CancelClass_AlreadyCancelled_ReturnsConflict()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"teacher.doublecancel.{suffix}@example.com";
        await SeedUserAsync("Teach", email, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, email, "TeachPass1!");
        var categoryId = await SeedCategoryAsync($"Mathematics-{suffix}");

        var created = await (await client.SendAsync(ScheduleRequest(token, categoryId, DateTime.UtcNow.AddDays(1), 10)))
            .Content.ReadFromJsonAsync<ClassDto>();

        await client.SendAsync(Authorized(HttpMethod.Post, $"/api/teacher/classes/{created!.Id}/cancel", token));
        var secondCancel = await client.SendAsync(Authorized(HttpMethod.Post, $"/api/teacher/classes/{created.Id}/cancel", token));

        Assert.Equal(HttpStatusCode.Conflict, secondCancel.StatusCode);
    }

    [Fact]
    public async Task MarkAttendance_ForEnrolledStudents_SavesAllRecordsInOneBatch()
    {
        // Scenario 1 (AA-62) - marking Present/Absent and submitting saves the records.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherEmail = $"teacher.attendance.{suffix}@example.com";
        await SeedUserAsync("Teach", teacherEmail, "TeachPass1!", "Teacher");
        var teacherToken = await LoginAsync(client, teacherEmail, "TeachPass1!");
        var categoryId = await SeedCategoryAsync($"Mathematics-{suffix}");

        var created = await (await client.SendAsync(ScheduleRequest(teacherToken, categoryId, DateTime.UtcNow.AddDays(1), 10)))
            .Content.ReadFromJsonAsync<ClassDto>();

        var studentAId = await SeedEnrolledStudentAsync(created!.Id, $"student.a.{suffix}@example.com");
        var studentBId = await SeedEnrolledStudentAsync(created.Id, $"student.b.{suffix}@example.com");

        var request = Authorized(HttpMethod.Post, $"/api/teacher/classes/{created.Id}/attendance", teacherToken);
        request.Content = JsonContent.Create(new
        {
            entries = new[]
            {
                new { studentId = studentAId, status = "Present" },
                new { studentId = studentBId, status = "Absent" },
            }
        });

        var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var records = context.Attendances.Where(a => a.ClassId == created.Id).ToList();
        Assert.Equal(2, records.Count);
        Assert.Contains(records, r => r.StudentId == studentAId && r.Status == "Present");
        Assert.Contains(records, r => r.StudentId == studentBId && r.Status == "Absent");
    }

    [Fact]
    public async Task MarkAttendance_ForANonEnrolledStudent_ReturnsBadRequestAndSavesNothing()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherEmail = $"teacher.badattendance.{suffix}@example.com";
        await SeedUserAsync("Teach", teacherEmail, "TeachPass1!", "Teacher");
        var teacherToken = await LoginAsync(client, teacherEmail, "TeachPass1!");
        var categoryId = await SeedCategoryAsync($"Mathematics-{suffix}");

        var created = await (await client.SendAsync(ScheduleRequest(teacherToken, categoryId, DateTime.UtcNow.AddDays(1), 10)))
            .Content.ReadFromJsonAsync<ClassDto>();

        var request = Authorized(HttpMethod.Post, $"/api/teacher/classes/{created!.Id}/attendance", teacherToken);
        request.Content = JsonContent.Create(new { entries = new[] { new { studentId = 999999, status = "Present" } } });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Empty(context.Attendances.Where(a => a.ClassId == created.Id));
    }

    [Fact]
    public async Task Classes_AsNonTeacher_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"nonteacher.classes.{suffix}@example.com";
        await SeedUserAsync("NonTeacher", email, "Pass1!", "Student");
        var token = await LoginAsync(client, email, "Pass1!");

        var response = await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher/classes", token));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
