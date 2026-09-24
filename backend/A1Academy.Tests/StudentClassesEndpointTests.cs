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
/// Integration tests for /api/student/classes - search/filter (AA-45), enrolment (AA-46), and
/// capacity enforcement including the concurrent-enrolment race (AA-47/AA-49).
/// </summary>
public class StudentClassesEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public StudentClassesEndpointTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<int> SeedUserAsync(string firstName, string? lastName, string email, string password, string role)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User
        {
            FirstName = firstName,
            LastName = lastName,
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

    private async Task<int> SeedCategoryAsync(string name)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var category = new Category { Name = name, Description = "Seeded for StudentClasses tests." };
        context.Categories.Add(category);
        await context.SaveChangesAsync();
        return category.Id;
    }

    private async Task<int> SeedClassAsync(int categoryId, int teacherId, int capacity, string status = "Active", string name = "Algebra Basics", DateTime? scheduledAt = null)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var targetClass = new Class
        {
            Name = name,
            CategoryId = categoryId,
            TeacherId = teacherId,
            ScheduledAt = scheduledAt ?? DateTime.UtcNow.AddDays(1),
            Capacity = capacity,
            Status = status,
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

    private class ClassDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string TeacherName { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public int EnrolledCount { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsEnrolled { get; set; }
    }

    [Fact]
    public async Task GetClasses_OnlyReturnsActiveClasses()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var studentEmail = $"student.browse.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Elena", "Rostova", $"teacher.browse.{suffix}@example.com", "TeachPass1!", "Teacher");
        await SeedUserAsync("Stu", "Dent", studentEmail, "StuPass1!", "Student");
        var studentToken = await LoginAsync(client, studentEmail, "StuPass1!");
        var categoryId = await SeedCategoryAsync($"Mathematics-{suffix}");

        await SeedClassAsync(categoryId, teacherId, 10, status: "Active", name: $"Active Class {suffix}");
        await SeedClassAsync(categoryId, teacherId, 10, status: "Cancelled", name: $"Cancelled Class {suffix}");

        var response = await client.SendAsync(Authorized(HttpMethod.Get, "/api/student/classes", studentToken));
        var classes = await response.Content.ReadFromJsonAsync<List<ClassDto>>();

        // This endpoint lists every Active class system-wide, so other tests' seeded classes may
        // also be present here (they share one in-memory database per IClassFixture) - the
        // per-test-unique suffix is what keeps this assertion about this test's own two classes.
        Assert.Contains(classes!, c => c.Name == $"Active Class {suffix}");
        Assert.DoesNotContain(classes!, c => c.Name == $"Cancelled Class {suffix}");
    }

    [Fact]
    public async Task GetClasses_FilteredByTeacherName_ReturnsOnlyMatchingClasses()
    {
        // Scenario 1 (AA-45) - the list narrows down to matching classes via teacherName.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var studentEmail = $"student.filter.{suffix}@example.com";
        var teacherAId = await SeedUserAsync("Elena", $"Rostova-{suffix}", $"teacher.rostova.{suffix}@example.com", "TeachPass1!", "Teacher");
        var teacherBId = await SeedUserAsync("Sam", $"Chen-{suffix}", $"teacher.chen.{suffix}@example.com", "TeachPass1!", "Teacher");
        await SeedUserAsync("Stu", "Dent", studentEmail, "StuPass1!", "Student");
        var studentToken = await LoginAsync(client, studentEmail, "StuPass1!");
        var categoryId = await SeedCategoryAsync($"Mathematics-{suffix}");

        await SeedClassAsync(categoryId, teacherAId, 10, name: $"Rostova Class {suffix}");
        await SeedClassAsync(categoryId, teacherBId, 10, name: $"Chen Class {suffix}");

        var response = await client.SendAsync(Authorized(HttpMethod.Get, $"/api/student/classes?teacherName=Rostova-{suffix}", studentToken));
        var classes = await response.Content.ReadFromJsonAsync<List<ClassDto>>();

        Assert.Contains(classes!, c => c.Name == $"Rostova Class {suffix}");
        Assert.DoesNotContain(classes!, c => c.Name == $"Chen Class {suffix}");
    }

    [Fact]
    public async Task Enroll_InAnAvailableClass_AddsStudentAndIncrementsCount()
    {
        // Scenario 1 (AA-46) - the Student is added to the roster.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var studentEmail = $"student.enroll.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Elena", "Rostova", $"teacher.enroll.{suffix}@example.com", "TeachPass1!", "Teacher");
        await SeedUserAsync("Stu", "Dent", studentEmail, "StuPass1!", "Student");
        var studentToken = await LoginAsync(client, studentEmail, "StuPass1!");
        var categoryId = await SeedCategoryAsync($"Mathematics-{suffix}");
        var classId = await SeedClassAsync(categoryId, teacherId, 10);

        var response = await client.SendAsync(Authorized(HttpMethod.Post, $"/api/student/classes/{classId}/enroll", studentToken));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<ClassDto>();
        Assert.True(updated!.IsEnrolled);
        Assert.Equal(1, updated.EnrolledCount);

        var mine = await (await client.SendAsync(Authorized(HttpMethod.Get, "/api/student/classes/mine", studentToken)))
            .Content.ReadFromJsonAsync<List<ClassDto>>();
        Assert.Single(mine!);
    }

    [Fact]
    public async Task Enroll_Twice_ReturnsConflictOnSecondAttempt()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var studentEmail = $"student.dupenroll.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Elena", "Rostova", $"teacher.dupenroll.{suffix}@example.com", "TeachPass1!", "Teacher");
        await SeedUserAsync("Stu", "Dent", studentEmail, "StuPass1!", "Student");
        var studentToken = await LoginAsync(client, studentEmail, "StuPass1!");
        var categoryId = await SeedCategoryAsync($"Mathematics-{suffix}");
        var classId = await SeedClassAsync(categoryId, teacherId, 10);

        await client.SendAsync(Authorized(HttpMethod.Post, $"/api/student/classes/{classId}/enroll", studentToken));
        var second = await client.SendAsync(Authorized(HttpMethod.Post, $"/api/student/classes/{classId}/enroll", studentToken));

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Enroll_InACancelledClass_ReturnsConflict()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var studentEmail = $"student.cancelledenroll.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Elena", "Rostova", $"teacher.cancelledenroll.{suffix}@example.com", "TeachPass1!", "Teacher");
        await SeedUserAsync("Stu", "Dent", studentEmail, "StuPass1!", "Student");
        var studentToken = await LoginAsync(client, studentEmail, "StuPass1!");
        var categoryId = await SeedCategoryAsync($"Mathematics-{suffix}");
        var classId = await SeedClassAsync(categoryId, teacherId, 10, status: "Cancelled");

        var response = await client.SendAsync(Authorized(HttpMethod.Post, $"/api/student/classes/{classId}/enroll", studentToken));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Enroll_InAFullClass_ReturnsConflictAndShowsClassFull()
    {
        // Scenario 1 (AA-47) - a class at max capacity strictly blocks further enrolment.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var studentEmail = $"student.full.{suffix}@example.com";
        var teacherId = await SeedUserAsync("Elena", "Rostova", $"teacher.full.{suffix}@example.com", "TeachPass1!", "Teacher");
        await SeedUserAsync("Stu", "Dent", studentEmail, "StuPass1!", "Student");
        var studentToken = await LoginAsync(client, studentEmail, "StuPass1!");
        var categoryId = await SeedCategoryAsync($"Mathematics-{suffix}");
        var classId = await SeedClassAsync(categoryId, teacherId, 1);

        // Fill the single seat with a different student first.
        await SeedUserAsync("Other", "Student", $"student.other.{suffix}@example.com", "StuPass1!", "Student");
        var otherToken = await LoginAsync(client, $"student.other.{suffix}@example.com", "StuPass1!");
        await client.SendAsync(Authorized(HttpMethod.Post, $"/api/student/classes/{classId}/enroll", otherToken));

        var response = await client.SendAsync(Authorized(HttpMethod.Post, $"/api/student/classes/{classId}/enroll", studentToken));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Enroll_ManyStudentsConcurrentlyForOneSeat_NeverOversellsCapacity()
    {
        // AA-49 - simulate multiple students enrolling simultaneously past the capacity
        // threshold, and prove the enrolled count never exceeds capacity.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherId = await SeedUserAsync("Elena", "Rostova", $"teacher.race.{suffix}@example.com", "TeachPass1!", "Teacher");
        var categoryId = await SeedCategoryAsync($"Mathematics-{suffix}");
        const int capacity = 3;
        const int contenders = 10;
        var classId = await SeedClassAsync(categoryId, teacherId, capacity);

        var tokens = new List<string>();
        for (var i = 0; i < contenders; i++)
        {
            var email = $"student.race{i}.{suffix}@example.com";
            await SeedUserAsync("Stu", $"Dent{i}", email, "StuPass1!", "Student");
            tokens.Add(await LoginAsync(client, email, "StuPass1!"));
        }

        var responses = await Task.WhenAll(tokens.Select(async t =>
        {
            using var raceClient = _factory.CreateClient();
            return await raceClient.SendAsync(Authorized(HttpMethod.Post, $"/api/student/classes/{classId}/enroll", t));
        }));

        var successCount = responses.Count(r => r.StatusCode == HttpStatusCode.OK);
        Assert.Equal(capacity, successCount);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var finalClass = await context.Classes.AsNoTracking().SingleAsync(c => c.Id == classId);
        var actualEnrollmentRows = await context.Enrollments.CountAsync(e => e.ClassId == classId);

        Assert.Equal(capacity, finalClass.EnrolledCount);
        Assert.Equal(capacity, actualEnrollmentRows);
        Assert.True(finalClass.EnrolledCount <= finalClass.Capacity);
    }

    [Fact]
    public async Task Classes_AsNonStudent_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"nonstudent.classes.{suffix}@example.com";
        await SeedUserAsync("NonStudent", null, email, "Pass1!", "Teacher");
        var token = await LoginAsync(client, email, "Pass1!");

        var response = await client.SendAsync(Authorized(HttpMethod.Get, "/api/student/classes", token));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
