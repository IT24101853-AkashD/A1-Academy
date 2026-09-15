using System.Linq;
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
/// Integration tests for /api/teacher-subject-requests - the Admin review queue for the "Other,
/// please specify" subject a Teacher can type at registration. Exercised through the real
/// ASP.NET Core pipeline, same style as TeacherSubjectsEndpointTests, so [Authorize(Roles =
/// "Admin")] actually runs.
/// </summary>
public class TeacherSubjectRequestsEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public TeacherSubjectRequestsEndpointTests(ApiWebApplicationFactory factory)
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
        var category = new Category { Name = name, Description = "Seeded for TeacherSubjectRequests tests." };
        context.Categories.Add(category);
        await context.SaveChangesAsync();
        return category.Id;
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

    // Registration is multipart ([FromForm] RegisterRequest, see AuthController) - built by hand
    // here rather than reusing JsonContent, the same way any other client submitting this form
    // would.
    private static async Task<HttpResponseMessage> RegisterTeacherAsync(
        HttpClient client, string email, string password, string? otherSubject, params int[] categoryIds)
    {
        using var content = new MultipartFormDataContent
        {
            { new StringContent("Teach"), "firstName" },
            { new StringContent(email), "email" },
            { new StringContent(password), "password" },
            { new StringContent("Teacher"), "role" },
            { new StringContent("BSc"), "qualifications" }
        };
        foreach (var id in categoryIds)
        {
            content.Add(new StringContent(id.ToString()), "categoryIds");
        }
        if (otherSubject != null)
        {
            content.Add(new StringContent(otherSubject), "otherSubject");
        }
        return await client.PostAsync("/api/auth/register", content);
    }

    private class TeacherSubjectRequestDto
    {
        public int Id { get; set; }
        public int TeacherId { get; set; }
        public string TeacherName { get; set; } = string.Empty;
        public string TeacherEmail { get; set; } = string.Empty;
        public string ProposedName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    [Fact]
    public async Task GetRequests_AsAdmin_ListsAPendingOtherSubjectSubmittedAtRegistration()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherEmail = $"teacher.other.{suffix}@example.com";
        var adminEmail = $"admin.list.{suffix}@example.com";
        await SeedUserAsync("Admin", adminEmail, "AdminPass1!", "Admin");
        var adminToken = await LoginAsync(client, adminEmail, "AdminPass1!");

        var registerResponse = await RegisterTeacherAsync(client, teacherEmail, "TeachPass1!", $"Robotics-{suffix}");
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        var response = await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher-subject-requests", adminToken));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var list = await response.Content.ReadFromJsonAsync<List<TeacherSubjectRequestDto>>();
        var entry = Assert.Single(list!, r => r.TeacherEmail == teacherEmail);
        Assert.Equal($"Robotics-{suffix}", entry.ProposedName);
        Assert.Equal("Pending", entry.Status);
    }

    [Fact]
    public async Task Approve_WithAnExistingCategory_AssignsTheTeacherAndMarksTheRequestApproved()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherEmail = $"teacher.approve.{suffix}@example.com";
        var adminEmail = $"admin.approve.{suffix}@example.com";
        await SeedUserAsync("Admin", adminEmail, "AdminPass1!", "Admin");
        var adminToken = await LoginAsync(client, adminEmail, "AdminPass1!");

        await RegisterTeacherAsync(client, teacherEmail, "TeachPass1!", $"Robotics-{suffix}");

        var listResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher-subject-requests", adminToken));
        var list = await listResponse.Content.ReadFromJsonAsync<List<TeacherSubjectRequestDto>>();
        var pending = list!.Single(r => r.TeacherEmail == teacherEmail);

        // The other half of the workflow - Admin decides the proposed subject is real and adds
        // it as a Category first, the same as any other category.
        var newCategoryId = await SeedCategoryAsync($"Robotics-{suffix}");

        var approveRequest = Authorized(HttpMethod.Post, $"/api/teacher-subject-requests/{pending.Id}/approve", adminToken);
        approveRequest.Content = JsonContent.Create(new { categoryId = newCategoryId });
        var approveResponse = await client.SendAsync(approveRequest);
        Assert.Equal(HttpStatusCode.OK, approveResponse.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var updatedRequest = await context.TeacherSubjectRequests.FindAsync(pending.Id);
        Assert.Equal(TeacherSubjectRequestStatus.Approved, updatedRequest!.Status);
        Assert.Equal(newCategoryId, updatedRequest.ResultingCategoryId);

        Assert.True(await context.TeacherSubjects
            .AnyAsync(ts => ts.TeacherId == pending.TeacherId && ts.CategoryId == newCategoryId));
    }

    [Fact]
    public async Task Approve_CalledASecondTime_ReturnsConflict()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherEmail = $"teacher.doubleapprove.{suffix}@example.com";
        var adminEmail = $"admin.doubleapprove.{suffix}@example.com";
        await SeedUserAsync("Admin", adminEmail, "AdminPass1!", "Admin");
        var adminToken = await LoginAsync(client, adminEmail, "AdminPass1!");

        await RegisterTeacherAsync(client, teacherEmail, "TeachPass1!", $"Pottery-{suffix}");
        var listResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher-subject-requests", adminToken));
        var pending = (await listResponse.Content.ReadFromJsonAsync<List<TeacherSubjectRequestDto>>())!
            .Single(r => r.TeacherEmail == teacherEmail);
        var categoryId = await SeedCategoryAsync($"Pottery-{suffix}");

        var firstApprove = Authorized(HttpMethod.Post, $"/api/teacher-subject-requests/{pending.Id}/approve", adminToken);
        firstApprove.Content = JsonContent.Create(new { categoryId });
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(firstApprove)).StatusCode);

        var secondApprove = Authorized(HttpMethod.Post, $"/api/teacher-subject-requests/{pending.Id}/approve", adminToken);
        secondApprove.Content = JsonContent.Create(new { categoryId });
        Assert.Equal(HttpStatusCode.Conflict, (await client.SendAsync(secondApprove)).StatusCode);
    }

    [Fact]
    public async Task Reject_MarksTheRequestRejectedAndCreatesNoTeacherSubject()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherEmail = $"teacher.reject.{suffix}@example.com";
        var adminEmail = $"admin.reject.{suffix}@example.com";
        await SeedUserAsync("Admin", adminEmail, "AdminPass1!", "Admin");
        var adminToken = await LoginAsync(client, adminEmail, "AdminPass1!");

        await RegisterTeacherAsync(client, teacherEmail, "TeachPass1!", $"Astrology-{suffix}");
        var listResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher-subject-requests", adminToken));
        var pending = (await listResponse.Content.ReadFromJsonAsync<List<TeacherSubjectRequestDto>>())!
            .Single(r => r.TeacherEmail == teacherEmail);

        var rejectResponse = await client.SendAsync(
            Authorized(HttpMethod.Post, $"/api/teacher-subject-requests/{pending.Id}/reject", adminToken));
        Assert.Equal(HttpStatusCode.OK, rejectResponse.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var updatedRequest = await context.TeacherSubjectRequests.FindAsync(pending.Id);
        Assert.Equal(TeacherSubjectRequestStatus.Rejected, updatedRequest!.Status);
        Assert.False(await context.TeacherSubjects.AnyAsync(ts => ts.TeacherId == pending.TeacherId));

        // No longer shows up in the default (Pending) queue.
        var pendingAgain = await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher-subject-requests", adminToken));
        var pendingList = await pendingAgain.Content.ReadFromJsonAsync<List<TeacherSubjectRequestDto>>();
        Assert.DoesNotContain(pendingList!, r => r.Id == pending.Id);
    }

    [Fact]
    public async Task Approve_WithANonexistentCategoryId_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherEmail = $"teacher.badcat.{suffix}@example.com";
        var adminEmail = $"admin.badcat.{suffix}@example.com";
        await SeedUserAsync("Admin", adminEmail, "AdminPass1!", "Admin");
        var adminToken = await LoginAsync(client, adminEmail, "AdminPass1!");

        await RegisterTeacherAsync(client, teacherEmail, "TeachPass1!", $"Origami-{suffix}");
        var listResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher-subject-requests", adminToken));
        var pending = (await listResponse.Content.ReadFromJsonAsync<List<TeacherSubjectRequestDto>>())!
            .Single(r => r.TeacherEmail == teacherEmail);

        var approveRequest = Authorized(HttpMethod.Post, $"/api/teacher-subject-requests/{pending.Id}/approve", adminToken);
        approveRequest.Content = JsonContent.Create(new { categoryId = 999999 });
        var response = await client.SendAsync(approveRequest);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("Student")]
    [InlineData("Teacher")]
    public async Task GetRequests_AsNonAdmin_ReturnsForbidden(string role)
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"nonadmin.{role.ToLowerInvariant()}.{suffix}@example.com";
        await SeedUserAsync("NonAdmin", email, "Pass1!", role);
        var token = await LoginAsync(client, email, "Pass1!");

        var response = await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher-subject-requests", token));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetRequests_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.SendAsync(new HttpRequestMessage(HttpMethod.Get, "/api/teacher-subject-requests"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}


