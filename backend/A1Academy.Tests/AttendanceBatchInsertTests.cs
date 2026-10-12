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
/// AA-66 - database integration tests for POST /api/teacher/classes/{id}/attendance. Each test
/// sends a batch through the real pipeline and then reads the Attendances table directly, so
/// what is asserted is what was actually stored: one row per student per class, an update (never
/// a duplicate) on re-marking, and nothing at all when any part of the batch is rejected.
/// </summary>
public class AttendanceBatchInsertTests : IClassFixture<ApiWebApplicationFactory>
{
    private const string Password = "AttendPass1!";
    private readonly ApiWebApplicationFactory _factory;

    public AttendanceBatchInsertTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private record SeededClass(int ClassId, string TeacherEmail);

    private class RosterRow
    {
        public int Id { get; set; }
        public string? AttendanceStatus { get; set; }
    }

    private static async Task<int> SeedUserAsync(AppDbContext context, string role, string email)
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

    // A fresh Teacher with one Active class of their own.
    private async Task<SeededClass> SeedClassAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var teacherEmail = $"teacher.batch.{suffix}@example.com";
        var teacherId = await SeedUserAsync(context, "Teacher", teacherEmail);

        var category = new Category { Name = $"Chemistry-{suffix}", Description = "Seeded for attendance batch tests." };
        context.Categories.Add(category);
        await context.SaveChangesAsync();

        var targetClass = new Class
        {
            Name = "Organic Chemistry",
            CategoryId = category.Id,
            TeacherId = teacherId,
            ScheduledAt = DateTime.UtcNow.AddDays(1),
            Capacity = 100,
        };
        context.Classes.Add(targetClass);
        await context.SaveChangesAsync();

        return new SeededClass(targetClass.Id, teacherEmail);
    }

    private async Task<List<int>> SeedEnrolledStudentsAsync(int classId, int count)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var studentIds = new List<int>();
        for (var i = 0; i < count; i++)
        {
            var studentId = await SeedUserAsync(context, "Student", $"student.batch.{Guid.NewGuid():N}@example.com");
            context.Enrollments.Add(new Enrollment { ClassId = classId, StudentId = studentId });
            studentIds.Add(studentId);
        }

        var targetClass = await context.Classes.FindAsync(classId);
        targetClass!.EnrolledCount += count;
        await context.SaveChangesAsync();

        return studentIds;
    }

    private async Task EnrollAsync(int classId, int studentId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Enrollments.Add(new Enrollment { ClassId = classId, StudentId = studentId });
        await context.SaveChangesAsync();
    }

    private async Task<string> LoginAsync(HttpClient client, string email)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password = Password });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        return body.GetProperty("token").GetString()!;
    }

    private static HttpRequestMessage AttendanceRequest(int classId, string token, IEnumerable<(int StudentId, string Status)> entries)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/teacher/classes/{classId}/attendance");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Content = JsonContent.Create(new
        {
            entries = entries.Select(e => new { studentId = e.StudentId, status = e.Status })
        });
        return request;
    }

    private async Task<List<Attendance>> StoredAttendanceAsync(int classId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await context.Attendances.AsNoTracking().Where(a => a.ClassId == classId).ToListAsync();
    }

    [Fact]
    public async Task MarkAttendance_ForAWholeClassInOneRequest_StoresExactlyOneRowPerStudent()
    {
        var seeded = await SeedClassAsync();
        var studentIds = await SeedEnrolledStudentsAsync(seeded.ClassId, 30);
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, seeded.TeacherEmail);

        // Every other student is absent, so each row has to carry its own status.
        var entries = studentIds
            .Select((id, index) => (id, index % 2 == 0 ? AttendanceStatus.Present : AttendanceStatus.Absent))
            .ToList();

        var response = await client.SendAsync(AttendanceRequest(seeded.ClassId, token, entries));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var stored = await StoredAttendanceAsync(seeded.ClassId);
        Assert.Equal(30, stored.Count);
        Assert.Equal(30, stored.Select(a => a.StudentId).Distinct().Count());
        foreach (var (studentId, status) in entries)
        {
            Assert.Equal(status, stored.Single(a => a.StudentId == studentId).Status);
        }
        Assert.Equal(15, stored.Count(a => a.Status == AttendanceStatus.Present));
        Assert.Equal(15, stored.Count(a => a.Status == AttendanceStatus.Absent));
    }

    [Fact]
    public async Task MarkAttendance_SubmittedAgain_UpdatesTheExistingRowsInsteadOfAddingDuplicates()
    {
        var seeded = await SeedClassAsync();
        var studentIds = await SeedEnrolledStudentsAsync(seeded.ClassId, 3);
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, seeded.TeacherEmail);

        (await client.SendAsync(AttendanceRequest(seeded.ClassId, token,
            studentIds.Select(id => (id, AttendanceStatus.Present))))).EnsureSuccessStatusCode();
        var firstSave = await StoredAttendanceAsync(seeded.ClassId);

        var correction = new[]
        {
            (studentIds[0], AttendanceStatus.Absent),
            (studentIds[1], AttendanceStatus.Present),
            (studentIds[2], AttendanceStatus.Absent),
        };
        var response = await client.SendAsync(AttendanceRequest(seeded.ClassId, token, correction));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var secondSave = await StoredAttendanceAsync(seeded.ClassId);
        Assert.Equal(3, secondSave.Count);
        // Same primary keys as the first save: the rows were updated in place, not replaced.
        Assert.Equal(firstSave.Select(a => a.Id).OrderBy(id => id), secondSave.Select(a => a.Id).OrderBy(id => id));
        Assert.Equal(AttendanceStatus.Absent, secondSave.Single(a => a.StudentId == studentIds[0]).Status);
        Assert.Equal(AttendanceStatus.Present, secondSave.Single(a => a.StudentId == studentIds[1]).Status);
        Assert.Equal(AttendanceStatus.Absent, secondSave.Single(a => a.StudentId == studentIds[2]).Status);
    }

    [Fact]
    public async Task MarkAttendance_BatchContainingOneNonEnrolledStudent_SavesNoneOfIt()
    {
        var seeded = await SeedClassAsync();
        var studentIds = await SeedEnrolledStudentsAsync(seeded.ClassId, 2);
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, seeded.TeacherEmail);

        // An earlier, valid mark that the rejected batch below must leave untouched.
        (await client.SendAsync(AttendanceRequest(seeded.ClassId, token,
            new[] { (studentIds[0], AttendanceStatus.Present) }))).EnsureSuccessStatusCode();

        var mixedBatch = new[]
        {
            (studentIds[0], AttendanceStatus.Absent),
            (studentIds[1], AttendanceStatus.Present),
            (999999, AttendanceStatus.Present),
        };
        var response = await client.SendAsync(AttendanceRequest(seeded.ClassId, token, mixedBatch));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var stored = Assert.Single(await StoredAttendanceAsync(seeded.ClassId));
        Assert.Equal(studentIds[0], stored.StudentId);
        Assert.Equal(AttendanceStatus.Present, stored.Status);
    }

    [Fact]
    public async Task MarkAttendance_BatchContainingAnUnknownStatus_ReturnsBadRequestAndSavesNothing()
    {
        var seeded = await SeedClassAsync();
        var studentIds = await SeedEnrolledStudentsAsync(seeded.ClassId, 2);
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, seeded.TeacherEmail);

        var response = await client.SendAsync(AttendanceRequest(seeded.ClassId, token, new[]
        {
            (studentIds[0], AttendanceStatus.Present),
            (studentIds[1], "Late"),
        }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(await StoredAttendanceAsync(seeded.ClassId));
    }

    [Fact]
    public async Task MarkAttendance_WithAnEmptyBatch_ReturnsBadRequestAndSavesNothing()
    {
        var seeded = await SeedClassAsync();
        await SeedEnrolledStudentsAsync(seeded.ClassId, 1);
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, seeded.TeacherEmail);

        var response = await client.SendAsync(AttendanceRequest(seeded.ClassId, token, Array.Empty<(int, string)>()));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(await StoredAttendanceAsync(seeded.ClassId));
    }

    [Fact]
    public async Task MarkAttendance_ForOnlyPartOfTheClass_LeavesTheOtherStudentsUnmarkedOnTheRoster()
    {
        var seeded = await SeedClassAsync();
        var studentIds = await SeedEnrolledStudentsAsync(seeded.ClassId, 3);
        var client = _factory.CreateClient();
        var token = await LoginAsync(client, seeded.TeacherEmail);

        var response = await client.SendAsync(AttendanceRequest(seeded.ClassId, token, new[]
        {
            (studentIds[0], AttendanceStatus.Present),
            (studentIds[1], AttendanceStatus.Absent),
        }));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, (await StoredAttendanceAsync(seeded.ClassId)).Count);

        // The saved state is what the roster reads back on the next page load.
        var rosterRequest = new HttpRequestMessage(HttpMethod.Get, $"/api/teacher/classes/{seeded.ClassId}/roster");
        rosterRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var roster = (await (await client.SendAsync(rosterRequest)).Content.ReadFromJsonAsync<List<RosterRow>>())!;
        Assert.Equal(3, roster.Count);
        Assert.Equal(AttendanceStatus.Present, roster.Single(r => r.Id == studentIds[0]).AttendanceStatus);
        Assert.Equal(AttendanceStatus.Absent, roster.Single(r => r.Id == studentIds[1]).AttendanceStatus);
        Assert.Null(roster.Single(r => r.Id == studentIds[2]).AttendanceStatus);
    }

    [Fact]
    public async Task MarkAttendance_ForAStudentInTwoClasses_KeepsASeparateRowPerClass()
    {
        var firstClass = await SeedClassAsync();
        var secondClass = await SeedClassAsync();
        var studentId = (await SeedEnrolledStudentsAsync(firstClass.ClassId, 1)).Single();
        await EnrollAsync(secondClass.ClassId, studentId);
        var client = _factory.CreateClient();

        var firstToken = await LoginAsync(client, firstClass.TeacherEmail);
        (await client.SendAsync(AttendanceRequest(firstClass.ClassId, firstToken,
            new[] { (studentId, AttendanceStatus.Present) }))).EnsureSuccessStatusCode();

        var secondToken = await LoginAsync(client, secondClass.TeacherEmail);
        (await client.SendAsync(AttendanceRequest(secondClass.ClassId, secondToken,
            new[] { (studentId, AttendanceStatus.Absent) }))).EnsureSuccessStatusCode();

        Assert.Equal(AttendanceStatus.Present, Assert.Single(await StoredAttendanceAsync(firstClass.ClassId)).Status);
        Assert.Equal(AttendanceStatus.Absent, Assert.Single(await StoredAttendanceAsync(secondClass.ClassId)).Status);
    }

    [Fact]
    public async Task MarkAttendance_ForAnotherTeachersClass_ReturnsNotFoundAndSavesNothing()
    {
        var seeded = await SeedClassAsync();
        var studentIds = await SeedEnrolledStudentsAsync(seeded.ClassId, 2);
        var otherTeacher = await SeedClassAsync();
        var client = _factory.CreateClient();
        var otherToken = await LoginAsync(client, otherTeacher.TeacherEmail);

        var response = await client.SendAsync(AttendanceRequest(seeded.ClassId, otherToken,
            studentIds.Select(id => (id, AttendanceStatus.Present))));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Empty(await StoredAttendanceAsync(seeded.ClassId));
    }

    [Fact]
    public void AttendanceTable_HasAUniqueIndexOnClassAndStudent()
    {
        // The in-memory provider doesn't enforce indexes, so the constraint the upsert relies on
        // is checked on the model itself - the same model the Postgres migrations are built from.
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var indexes = context.Model.FindEntityType(typeof(Attendance))!.GetIndexes();

        Assert.Contains(indexes, index => index.IsUnique
            && index.Properties.Select(p => p.Name).SequenceEqual(new[] { nameof(Attendance.ClassId), nameof(Attendance.StudentId) }));
    }
}
