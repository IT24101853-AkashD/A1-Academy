using System.Linq;
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

namespace A1Academy.Tests;

/// <summary>
/// Integration tests for GET /api/users, exercised through the real ASP.NET Core pipeline
/// (via WebApplicationFactory) rather than calling the controller action directly - that's the
/// only way to actually verify the [Authorize(Roles = "Admin")] middleware does its job, which
/// is the real security boundary the "Role Restriction" acceptance criterion depends on.
/// </summary>
public class UsersEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public UsersEndpointTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task SeedUserAsync(string firstName, string lastName, string email, string password, string role, string accountStatus = AccountStatus.Active)
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
            AccountStatus = accountStatus,
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

    [Fact]
    public async Task GetUsers_AsAdmin_ReturnsOkWithDirectoryFields()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Ada", "Admin", $"ada.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("John", "Doe", $"john.{suffix}@example.com", "StudentPass1!", "Student");
        await SeedUserAsync("Jane", "Smith", $"jane.{suffix}@example.com", "TeacherPass1!", "Teacher");
        await SeedUserAsync("Pending", "Teacher", $"pending.{suffix}@example.com", "TeacherPass1!", "Teacher", accountStatus: AccountStatus.Pending);

        var token = await LoginAsync(client, $"ada.{suffix}@example.com", "AdminPass1!");
        // pageSize big enough to guarantee our four freshly-seeded users land on this one page
        // regardless of how many other users earlier tests in this class have already seeded
        // into the shared in-memory database - this test only cares about its own rows.
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/users?pageSize=1000");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var rawJson = await response.Content.ReadAsStringAsync();
        // Never leak auth internals through this endpoint, even accidentally.
        Assert.DoesNotContain("passwordHash", rawJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("otp", rawJson, StringComparison.OrdinalIgnoreCase);

        var page = JsonSerializer.Deserialize<PagedUsersResponseDto>(rawJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
        var users = page.Items;

        var admin = Assert.Single(users, u => u.Email == $"ada.{suffix}@example.com");
        Assert.Equal("Ada Admin", admin.Name);
        Assert.Equal("Admin", admin.Role);
        Assert.Equal("Active", admin.Status);

        var student = Assert.Single(users, u => u.Email == $"john.{suffix}@example.com");
        Assert.Equal("John Doe", student.Name);
        Assert.Equal("Student", student.Role);
        Assert.Equal("Active", student.Status);

        var approvedTeacher = Assert.Single(users, u => u.Email == $"jane.{suffix}@example.com");
        Assert.Equal("Teacher", approvedTeacher.Role);
        Assert.Equal("Active", approvedTeacher.Status);

        var pendingTeacher = Assert.Single(users, u => u.Email == $"pending.{suffix}@example.com");
        Assert.Equal("Teacher", pendingTeacher.Role);
        Assert.Equal("Pending", pendingTeacher.Status);
    }

    [Fact]
    public async Task GetUsers_AsStudent_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        var email = $"student.{Guid.NewGuid():N}@example.com";
        await SeedUserAsync("Student", "User", email, "StudentPass1!", "Student");

        var token = await LoginAsync(client, email, "StudentPass1!");
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/users");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetUsers_AsTeacher_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        var email = $"teacher.{Guid.NewGuid():N}@example.com";
        await SeedUserAsync("Teacher", "User", email, "TeacherPass1!", "Teacher");

        var token = await LoginAsync(client, email, "TeacherPass1!");
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/users");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetUsers_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/users");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetUsers_AsAdmin_PaginatesAcrossMultiplePages()
    {
        // The in-memory database backing ApiWebApplicationFactory is shared by every test in
        // this class (one instance per class, not per test), so other tests' seeded users are
        // already present here. Rather than assert an absolute TotalCount, this test reads
        // whatever total the endpoint reports and checks pagination is internally consistent
        // with it - which is what the "Paginated Results"/"Navigation Controls" ACs actually
        // require, and it stays correct no matter what order tests run in.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Zz-Admin", "Seed", $"zzadmin.{suffix}@example.com", "AdminPass1!", "Admin");
        for (var i = 0; i < 12; i++)
        {
            await SeedUserAsync($"Student{i:D2}", "Seed", $"student{i:D2}.{suffix}@example.com", "StudentPass1!", "Student");
        }

        var token = await LoginAsync(client, $"zzadmin.{suffix}@example.com", "AdminPass1!");

        async Task<PagedUsersResponseDto> GetPageAsync(int page, int pageSize)
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"/api/users?page={page}&pageSize={pageSize}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            return (await response.Content.ReadFromJsonAsync<PagedUsersResponseDto>())!;
        }

        // A page big enough to hold everything reveals the current total (at least our own 13
        // freshly-seeded users, plus whatever earlier tests in this class left behind).
        var everything = await GetPageAsync(1, 1000);
        var totalCount = everything.TotalCount;
        Assert.True(totalCount >= 13);

        const int pageSize = 5;
        var expectedTotalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var firstPage = await GetPageAsync(1, pageSize);
        Assert.Equal(1, firstPage.Page);
        Assert.Equal(pageSize, firstPage.PageSize);
        Assert.Equal(totalCount, firstPage.TotalCount);
        Assert.Equal(expectedTotalPages, firstPage.TotalPages);
        Assert.Equal(pageSize, firstPage.Items.Count);

        var secondPage = await GetPageAsync(2, pageSize);
        Assert.Equal(pageSize, secondPage.Items.Count);
        // Pages don't overlap or repeat entries.
        Assert.Empty(firstPage.Items.Select(u => u.Email).Intersect(secondPage.Items.Select(u => u.Email)));

        var lastPage = await GetPageAsync(expectedTotalPages, pageSize);
        var remainder = totalCount % pageSize;
        var expectedLastPageCount = remainder == 0 ? pageSize : remainder;
        Assert.Equal(expectedLastPageCount, lastPage.Items.Count);

        var pastLastPage = await GetPageAsync(expectedTotalPages + 1, pageSize);
        Assert.Empty(pastLastPage.Items);
        Assert.Equal(totalCount, pastLastPage.TotalCount);
    }

    [Fact]
    public async Task GetUsers_WithInvalidPagingInput_ClampsToSensibleBounds()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        await SeedUserAsync("Clamp", "Admin", $"clampadmin.{suffix}@example.com", "AdminPass1!", "Admin");

        var token = await LoginAsync(client, $"clampadmin.{suffix}@example.com", "AdminPass1!");

        // page=0 and a very large pageSize should clamp rather than error.
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/users?page=0&pageSize=99999");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = (await response.Content.ReadFromJsonAsync<PagedUsersResponseDto>())!;
        Assert.Equal(1, page.Page);
        Assert.Equal(100, page.PageSize); // MaxPageSize in the controller
    }

    [Fact]
    public async Task GetUsers_FilteredByRoleAndStatus_ReturnsOnlyPendingTeachers()
    {
        // This is the exact scenario the "Filter Pending Teachers" acceptance criterion
        // describes: role=Teacher + status=Pending should isolate only Teacher accounts still
        // awaiting approval, excluding approved teachers, students, and admins.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Filter", "Admin", $"filteradmin.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Approved", "Teacher", $"approvedteacher.{suffix}@example.com", "TeacherPass1!", "Teacher");
        await SeedUserAsync("Pending", "TeacherOne", $"pendingteacher1.{suffix}@example.com", "TeacherPass1!", "Teacher", accountStatus: AccountStatus.Pending);
        await SeedUserAsync("Pending", "TeacherTwo", $"pendingteacher2.{suffix}@example.com", "TeacherPass1!", "Teacher", accountStatus: AccountStatus.Pending);
        await SeedUserAsync("Some", "Student", $"filterstudent.{suffix}@example.com", "StudentPass1!", "Student");

        var token = await LoginAsync(client, $"filteradmin.{suffix}@example.com", "AdminPass1!");
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/users?role=Teacher&status=Pending&pageSize=100");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var page = (await response.Content.ReadFromJsonAsync<PagedUsersResponseDto>())!;
        var ourEmails = new[]
        {
            $"filteradmin.{suffix}@example.com",
            $"approvedteacher.{suffix}@example.com",
            $"pendingteacher1.{suffix}@example.com",
            $"pendingteacher2.{suffix}@example.com",
            $"filterstudent.{suffix}@example.com",
        };
        var ourResults = page.Items.Where(u => ourEmails.Contains(u.Email)).ToList();

        Assert.Equal(2, ourResults.Count);
        Assert.All(ourResults, u => Assert.Equal("Teacher", u.Role));
        Assert.All(ourResults, u => Assert.Equal("Pending", u.Status));
        Assert.Contains(ourResults, u => u.Email == $"pendingteacher1.{suffix}@example.com");
        Assert.Contains(ourResults, u => u.Email == $"pendingteacher2.{suffix}@example.com");
    }

    [Fact]
    public async Task GetUsers_FilteredByRoleOnly_IncludesBothApprovedAndPendingTeachers()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("RoleFilter", "Admin", $"rolefilteradmin.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Approved", "Teacher", $"roleapproved.{suffix}@example.com", "TeacherPass1!", "Teacher");
        await SeedUserAsync("Pending", "Teacher", $"rolepending.{suffix}@example.com", "TeacherPass1!", "Teacher", accountStatus: AccountStatus.Pending);
        await SeedUserAsync("Some", "Student", $"rolestudent.{suffix}@example.com", "StudentPass1!", "Student");

        var token = await LoginAsync(client, $"rolefilteradmin.{suffix}@example.com", "AdminPass1!");
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/users?role=Teacher&pageSize=100");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.SendAsync(request);
        var page = (await response.Content.ReadFromJsonAsync<PagedUsersResponseDto>())!;

        Assert.Contains(page.Items, u => u.Email == $"roleapproved.{suffix}@example.com" && u.Status == "Active");
        Assert.Contains(page.Items, u => u.Email == $"rolepending.{suffix}@example.com" && u.Status == "Pending");
        Assert.DoesNotContain(page.Items, u => u.Email == $"rolestudent.{suffix}@example.com");
        Assert.DoesNotContain(page.Items, u => u.Email == $"rolefilteradmin.{suffix}@example.com");
    }

    [Fact]
    public async Task GetUsers_FilteredByStatusActive_ExcludesPendingTeachers()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("StatusFilter", "Admin", $"statusfilteradmin.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Pending", "Teacher", $"statuspending.{suffix}@example.com", "TeacherPass1!", "Teacher", accountStatus: AccountStatus.Pending);
        await SeedUserAsync("Some", "Student", $"statusstudent.{suffix}@example.com", "StudentPass1!", "Student");

        var token = await LoginAsync(client, $"statusfilteradmin.{suffix}@example.com", "AdminPass1!");
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/users?status=Active&pageSize=100");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.SendAsync(request);
        var page = (await response.Content.ReadFromJsonAsync<PagedUsersResponseDto>())!;

        Assert.Contains(page.Items, u => u.Email == $"statusfilteradmin.{suffix}@example.com");
        Assert.Contains(page.Items, u => u.Email == $"statusstudent.{suffix}@example.com");
        Assert.DoesNotContain(page.Items, u => u.Email == $"statuspending.{suffix}@example.com");
    }

    [Fact]
    public async Task ApproveTeacher_AsAdmin_FlipsPendingTeacherToActive()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Approve", "Admin", $"approveadmin.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Grace", "Green", $"gracegreen.{suffix}@example.com", "TeacherPass1!", "Teacher", accountStatus: AccountStatus.Pending);

        var token = await LoginAsync(client, $"approveadmin.{suffix}@example.com", "AdminPass1!");
        var pendingId = await FindUserIdAsync(client, token, $"gracegreen.{suffix}@example.com");

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{pendingId}/approve");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.Content.ReadFromJsonAsync<UserSummaryDto>())!;
        Assert.Equal("Active", updated.Status);
        Assert.Equal("Teacher", updated.Role);

        // Reflected in the directory too, not just the approve response.
        var directory = await GetUsersAsync(client, token, $"?role=Teacher&status=Pending&pageSize=100");
        Assert.DoesNotContain(directory.Items, u => u.Email == $"gracegreen.{suffix}@example.com");
    }

    [Fact]
    public async Task ApproveTeacher_UnblocksLoginForThatTeacher()
    {
        // This is the actual point of the ticket, not just the flag flip: a Pending Teacher
        // can't log in at all until an Admin approves them, and approval should unblock login
        // immediately - no re-registration, no waiting on anything else.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherEmail = $"unblock.{suffix}@example.com";
        const string teacherPassword = "TeacherPass1!";

        await SeedUserAsync("Approve", "AdminSix", $"approveadmin6.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Unblock", "Teacher", teacherEmail, teacherPassword, "Teacher", accountStatus: AccountStatus.Pending);

        // Can't log in yet - still Pending.
        var blockedResponse = await client.PostAsJsonAsync("/api/auth/login", new { email = teacherEmail, password = teacherPassword });
        Assert.Equal(HttpStatusCode.Unauthorized, blockedResponse.StatusCode);

        var adminToken = await LoginAsync(client, $"approveadmin6.{suffix}@example.com", "AdminPass1!");
        var teacherId = await FindUserIdAsync(client, adminToken, teacherEmail);

        var approveRequest = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{teacherId}/approve");
        approveRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var approveResponse = await client.SendAsync(approveRequest);
        Assert.Equal(HttpStatusCode.OK, approveResponse.StatusCode);

        // Same credentials, now let in.
        var unblockedResponse = await client.PostAsJsonAsync("/api/auth/login", new { email = teacherEmail, password = teacherPassword });
        Assert.Equal(HttpStatusCode.OK, unblockedResponse.StatusCode);
        var body = await unblockedResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(string.IsNullOrEmpty(body.GetProperty("token").GetString()));
        Assert.Equal("Teacher", body.GetProperty("role").GetString());
    }

    [Fact]
    public async Task ApproveTeacher_AlreadyActive_ReturnsBadRequest()
    {
        // The edge case called out on the ticket by name: approving an account that's already
        // Active isn't a harmless no-op here, it's an invalid move - Approve only makes sense
        // coming from Pending, so an admin double-clicking it (or hitting it on a stale page)
        // gets told why instead of the request silently succeeding twice.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Approve", "AdminTwo", $"approveadmin2.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Already", "Approved", $"alreadyapproved.{suffix}@example.com", "TeacherPass1!", "Teacher");

        var token = await LoginAsync(client, $"approveadmin2.{suffix}@example.com", "AdminPass1!");
        var teacherId = await FindUserIdAsync(client, token, $"alreadyapproved.{suffix}@example.com");

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{teacherId}/approve");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        // Still Active, unchanged - the rejected request didn't do any partial damage.
        var directory = await GetUsersAsync(client, token, "?pageSize=1000");
        var stillActive = Assert.Single(directory.Items, u => u.Email == $"alreadyapproved.{suffix}@example.com");
        Assert.Equal("Active", stillActive.Status);
    }

    [Fact]
    public async Task ApproveTeacher_OnRejectedAccount_ReturnsBadRequest()
    {
        // Rejected is meant to be the end of the line for that application - approve isn't a
        // way to walk it back, only a fresh registration is.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Approve", "AdminSeven", $"approveadmin7.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Already", "Rejected", $"alreadyrejected.{suffix}@example.com", "TeacherPass1!", "Teacher", accountStatus: AccountStatus.Rejected);

        var token = await LoginAsync(client, $"approveadmin7.{suffix}@example.com", "AdminPass1!");
        var teacherId = await FindUserIdAsync(client, token, $"alreadyrejected.{suffix}@example.com");

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{teacherId}/approve");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RejectTeacher_AsAdmin_FlipsPendingTeacherToRejected()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Reject", "Admin", $"rejectadmin.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Turned", "Down", $"turneddown.{suffix}@example.com", "TeacherPass1!", "Teacher", accountStatus: AccountStatus.Pending);

        var token = await LoginAsync(client, $"rejectadmin.{suffix}@example.com", "AdminPass1!");
        var teacherId = await FindUserIdAsync(client, token, $"turneddown.{suffix}@example.com");

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{teacherId}/reject");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.Content.ReadFromJsonAsync<UserSummaryDto>())!;
        Assert.Equal("Rejected", updated.Status);

        // A rejected teacher stays locked out of login, same as while they were Pending, just
        // with a message that doesn't suggest waiting will help.
        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new { email = $"turneddown.{suffix}@example.com", password = "TeacherPass1!" });
        Assert.Equal(HttpStatusCode.Unauthorized, loginResponse.StatusCode);
        var loginBody = await loginResponse.Content.ReadAsStringAsync();
        Assert.Contains("not approved", loginBody, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RejectTeacher_OnActiveAccount_ReturnsBadRequest()
    {
        // Invalid transition: Reject only makes sense for a Pending application, not an
        // account that's already up and running.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Reject", "AdminTwo", $"rejectadmin2.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Cant", "RejectMe", $"cantrejectme.{suffix}@example.com", "TeacherPass1!", "Teacher");

        var token = await LoginAsync(client, $"rejectadmin2.{suffix}@example.com", "AdminPass1!");
        var teacherId = await FindUserIdAsync(client, token, $"cantrejectme.{suffix}@example.com");

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{teacherId}/reject");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RejectTeacher_AsNonAdmin_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Reject", "AdminThree", $"rejectadmin3.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Some", "PendingTeacher", $"rejecttarget.{suffix}@example.com", "TeacherPass1!", "Teacher", accountStatus: AccountStatus.Pending);
        await SeedUserAsync("Sneaky", "StudentTwo", $"sneakystudent2.{suffix}@example.com", "StudentPass1!", "Student");

        var adminToken = await LoginAsync(client, $"rejectadmin3.{suffix}@example.com", "AdminPass1!");
        var targetId = await FindUserIdAsync(client, adminToken, $"rejecttarget.{suffix}@example.com");

        var studentToken = await LoginAsync(client, $"sneakystudent2.{suffix}@example.com", "StudentPass1!");
        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{targetId}/reject");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeactivateUser_AsAdmin_FlipsActiveAccountToDeactivatedAndBlocksLogin()
    {
        // Deactivation isn't Teacher-specific - this one's a Student, on purpose.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var studentEmail = $"deactivateme.{suffix}@example.com";
        const string studentPassword = "StudentPass1!";

        await SeedUserAsync("Deactivate", "Admin", $"deactivateadmin.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Deactivate", "Me", studentEmail, studentPassword, "Student");

        var token = await LoginAsync(client, $"deactivateadmin.{suffix}@example.com", "AdminPass1!");
        var studentId = await FindUserIdAsync(client, token, studentEmail);

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{studentId}/deactivate");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.Content.ReadFromJsonAsync<UserSummaryDto>())!;
        Assert.Equal("Deactivated", updated.Status);

        // Could log in a second ago, can't now.
        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new { email = studentEmail, password = studentPassword });
        Assert.Equal(HttpStatusCode.Unauthorized, loginResponse.StatusCode);
        var loginBody = await loginResponse.Content.ReadAsStringAsync();
        Assert.Contains("deactivated", loginBody, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DeactivateUser_TerminatesTheirExistingSessionImmediately()
    {
        // This is the "Immediate Session Termination" ticket itself: blocking future logins
        // (covered above) isn't enough on its own, since a JWT issued before the deactivation is
        // otherwise still perfectly valid for up to 7 more days. Two Admins are used here (rather
        // than an Admin deactivating a Student) specifically so the still-unexpired token is
        // tried against an Admin-only endpoint - that isolates a 401 (session killed) from a 403
        // (wrong role), which a Student's token could never distinguish.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var targetEmail = $"sessiontarget.{suffix}@example.com";
        const string targetPassword = "AdminPass1!";

        await SeedUserAsync("Session", "Target", targetEmail, targetPassword, "Admin");
        await SeedUserAsync("Session", "Operator", $"sessionoperator.{suffix}@example.com", "AdminPass1!", "Admin");

        var targetToken = await LoginAsync(client, targetEmail, targetPassword);
        var operatorToken = await LoginAsync(client, $"sessionoperator.{suffix}@example.com", "AdminPass1!");

        // Sanity check: the token is genuinely good right up until the deactivation.
        var beforeRequest = new HttpRequestMessage(HttpMethod.Get, "/api/users");
        beforeRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", targetToken);
        var beforeResponse = await client.SendAsync(beforeRequest);
        Assert.Equal(HttpStatusCode.OK, beforeResponse.StatusCode);

        var targetId = await FindUserIdAsync(client, operatorToken, targetEmail);
        var deactivateRequest = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{targetId}/deactivate");
        deactivateRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", operatorToken);
        var deactivateResponse = await client.SendAsync(deactivateRequest);
        Assert.Equal(HttpStatusCode.OK, deactivateResponse.StatusCode);

        // Same token, same endpoint, no re-login in between - the only thing that changed is the
        // account's status. A 403 here would mean the role check alone is running and the
        // account-status recheck isn't; this must be 401, proving the session itself was killed.
        var afterRequest = new HttpRequestMessage(HttpMethod.Get, "/api/users");
        afterRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", targetToken);
        var afterResponse = await client.SendAsync(afterRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, afterResponse.StatusCode);

        // The operator's own, unaffected token still works fine - deactivation only invalidates
        // the targeted account's session, not every session in the system.
        var operatorStillWorks = new HttpRequestMessage(HttpMethod.Get, "/api/users");
        operatorStillWorks.Headers.Authorization = new AuthenticationHeaderValue("Bearer", operatorToken);
        var operatorStillWorksResponse = await client.SendAsync(operatorStillWorks);
        Assert.Equal(HttpStatusCode.OK, operatorStillWorksResponse.StatusCode);
    }

    [Fact]
    public async Task ReactivateUser_DoesNotResurrectTheOldPreDeactivationToken()
    {
        // Reactivating unblocks *login* (covered elsewhere), but it must not retroactively make
        // the token from before the deactivation good again - that token's security stamp is
        // still the old one, and reactivation rotates the stamp again rather than restoring it.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var targetEmail = $"reactivatesession.{suffix}@example.com";
        const string targetPassword = "AdminPass1!";

        await SeedUserAsync("Reactivate", "SessionTarget", targetEmail, targetPassword, "Admin");
        await SeedUserAsync("Reactivate", "SessionOperator", $"reactivatesessionop.{suffix}@example.com", "AdminPass1!", "Admin");

        var oldToken = await LoginAsync(client, targetEmail, targetPassword);
        var operatorToken = await LoginAsync(client, $"reactivatesessionop.{suffix}@example.com", "AdminPass1!");
        var targetId = await FindUserIdAsync(client, operatorToken, targetEmail);

        async Task PatchAsOperatorAsync(string action)
        {
            var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{targetId}/{action}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", operatorToken);
            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        await PatchAsOperatorAsync("deactivate");
        await PatchAsOperatorAsync("reactivate");

        // A fresh login works again post-reactivation...
        var freshLoginResponse = await client.PostAsJsonAsync("/api/auth/login", new { email = targetEmail, password = targetPassword });
        Assert.Equal(HttpStatusCode.OK, freshLoginResponse.StatusCode);

        // ...but the token minted before any of this happened stays dead.
        var oldTokenRequest = new HttpRequestMessage(HttpMethod.Get, "/api/users");
        oldTokenRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", oldToken);
        var oldTokenResponse = await client.SendAsync(oldTokenRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, oldTokenResponse.StatusCode);
    }

    [Fact]
    public async Task DeactivateUser_OnPendingAccount_ReturnsBadRequest()
    {
        // Invalid transition: there's no "Active" to switch off yet for a Pending application.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Deactivate", "AdminTwo", $"deactivateadmin2.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Still", "Pending", $"stillpending.{suffix}@example.com", "TeacherPass1!", "Teacher", accountStatus: AccountStatus.Pending);

        var token = await LoginAsync(client, $"deactivateadmin2.{suffix}@example.com", "AdminPass1!");
        var teacherId = await FindUserIdAsync(client, token, $"stillpending.{suffix}@example.com");

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{teacherId}/deactivate");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DeactivateUser_AlreadyDeactivated_ReturnsBadRequest()
    {
        // Edge case in the same spirit as re-approving an Active account: deactivating an
        // already-Deactivated account is a no-op that should be rejected, not silently allowed.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Deactivate", "AdminThree", $"deactivateadmin3.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Already", "Off", $"alreadyoff.{suffix}@example.com", "StudentPass1!", "Student", accountStatus: AccountStatus.Deactivated);

        var token = await LoginAsync(client, $"deactivateadmin3.{suffix}@example.com", "AdminPass1!");
        var studentId = await FindUserIdAsync(client, token, $"alreadyoff.{suffix}@example.com");

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{studentId}/deactivate");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DeactivateUser_AsNonAdmin_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Deactivate", "AdminFour", $"deactivateadmin4.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Deactivate", "Target", $"deactivatetarget.{suffix}@example.com", "StudentPass1!", "Student");
        await SeedUserAsync("Sneaky", "StudentThree", $"sneakystudent3.{suffix}@example.com", "StudentPass1!", "Student");

        var adminToken = await LoginAsync(client, $"deactivateadmin4.{suffix}@example.com", "AdminPass1!");
        var targetId = await FindUserIdAsync(client, adminToken, $"deactivatetarget.{suffix}@example.com");

        var studentToken = await LoginAsync(client, $"sneakystudent3.{suffix}@example.com", "StudentPass1!");
        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{targetId}/deactivate");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeactivateUser_OnOwnAccount_ReturnsBadRequestAndTheAccountStaysActive()
    {
        // The bug report: an Admin was able to deactivate themselves, which should never be
        // possible - it locks them out mid-session and, if they're the only Admin, locks
        // everyone out of ever reversing it (reactivation is itself Admin-only).
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var selfEmail = $"selfdeactivate.{suffix}@example.com";
        const string selfPassword = "AdminPass1!";

        await SeedUserAsync("Self", "Deactivate", selfEmail, selfPassword, "Admin");
        var token = await LoginAsync(client, selfEmail, selfPassword);
        var selfId = await FindUserIdAsync(client, token, selfEmail);

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{selfId}/deactivate");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        // Still Active, and the token is still good - the rejected request did nothing at all.
        var directory = await GetUsersAsync(client, token, "?pageSize=1000");
        var stillActive = Assert.Single(directory.Items, u => u.Email == selfEmail);
        Assert.Equal("Active", stillActive.Status);

        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new { email = selfEmail, password = selfPassword });
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
    }

    [Fact]
    public async Task DeactivateUser_OnOwnAccount_IsRejectedBeforeAnyOtherAdminCouldDoIt()
    {
        // Same rule, phrased the other way round: another Admin deactivating this Admin is
        // perfectly legal - only acting on your *own* account id is blocked.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var targetEmail = $"otheradmintarget.{suffix}@example.com";

        await SeedUserAsync("Other", "AdminTarget", targetEmail, "AdminPass1!", "Admin");
        await SeedUserAsync("Other", "AdminOperator", $"otheradminop.{suffix}@example.com", "AdminPass1!", "Admin");

        var operatorToken = await LoginAsync(client, $"otheradminop.{suffix}@example.com", "AdminPass1!");
        var targetId = await FindUserIdAsync(client, operatorToken, targetEmail);

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{targetId}/deactivate");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", operatorToken);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.Content.ReadFromJsonAsync<UserSummaryDto>())!;
        Assert.Equal("Deactivated", updated.Status);
    }

    [Fact]
    public async Task ReactivateUser_OnOwnAccount_ReturnsBadRequest()
    {
        // Same self-action guard, exercised on Reactivate - defense in depth even though a
        // Deactivated Admin's own token would already be dead and couldn't reach this endpoint
        // as themselves in practice.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var operatorEmail = $"selfreactivateop.{suffix}@example.com";

        await SeedUserAsync("Self", "ReactivateOperator", operatorEmail, "AdminPass1!", "Admin");
        var operatorToken = await LoginAsync(client, operatorEmail, "AdminPass1!");
        var operatorId = await FindUserIdAsync(client, operatorToken, operatorEmail);

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{operatorId}/reactivate");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", operatorToken);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ReactivateUser_AsAdmin_FlipsDeactivatedAccountToActiveAndUnblocksLogin()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherEmail = $"reactivateme.{suffix}@example.com";
        const string teacherPassword = "TeacherPass1!";

        await SeedUserAsync("Reactivate", "Admin", $"reactivateadmin.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Reactivate", "Me", teacherEmail, teacherPassword, "Teacher", accountStatus: AccountStatus.Deactivated);

        var token = await LoginAsync(client, $"reactivateadmin.{suffix}@example.com", "AdminPass1!");
        var teacherId = await FindUserIdAsync(client, token, teacherEmail);

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{teacherId}/reactivate");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.Content.ReadFromJsonAsync<UserSummaryDto>())!;
        Assert.Equal("Active", updated.Status);

        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new { email = teacherEmail, password = teacherPassword });
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
    }

    [Fact]
    public async Task ReactivateUser_OnActiveAccount_ReturnsBadRequest()
    {
        // Invalid transition: Reactivate only means something coming from Deactivated.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Reactivate", "AdminTwo", $"reactivateadmin2.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Already", "OnAndFine", $"alreadyfine.{suffix}@example.com", "StudentPass1!", "Student");

        var token = await LoginAsync(client, $"reactivateadmin2.{suffix}@example.com", "AdminPass1!");
        var studentId = await FindUserIdAsync(client, token, $"alreadyfine.{suffix}@example.com");

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{studentId}/reactivate");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ReactivateUser_OnPendingAccount_ReturnsBadRequest()
    {
        // Invalid transition: a Pending application was never Deactivated in the first place -
        // Approve or Reject are the only legal moves from here, not Reactivate.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Reactivate", "AdminThree", $"reactivateadmin3.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Still", "PendingToo", $"stillpendingtoo.{suffix}@example.com", "TeacherPass1!", "Teacher", accountStatus: AccountStatus.Pending);

        var token = await LoginAsync(client, $"reactivateadmin3.{suffix}@example.com", "AdminPass1!");
        var teacherId = await FindUserIdAsync(client, token, $"stillpendingtoo.{suffix}@example.com");

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{teacherId}/reactivate");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ReactivateUser_AsNonAdmin_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Reactivate", "AdminFour", $"reactivateadmin4.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Reactivate", "Target", $"reactivatetarget.{suffix}@example.com", "StudentPass1!", "Student", accountStatus: AccountStatus.Deactivated);
        await SeedUserAsync("Sneaky", "StudentFour", $"sneakystudent4.{suffix}@example.com", "StudentPass1!", "Student");

        var adminToken = await LoginAsync(client, $"reactivateadmin4.{suffix}@example.com", "AdminPass1!");
        var targetId = await FindUserIdAsync(client, adminToken, $"reactivatetarget.{suffix}@example.com");

        var studentToken = await LoginAsync(client, $"sneakystudent4.{suffix}@example.com", "StudentPass1!");
        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{targetId}/reactivate");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ApproveTeacher_OnStudentAccount_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Approve", "AdminThree", $"approveadmin3.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Not", "ATeacher", $"notateacher.{suffix}@example.com", "StudentPass1!", "Student");

        var token = await LoginAsync(client, $"approveadmin3.{suffix}@example.com", "AdminPass1!");
        var studentId = await FindUserIdAsync(client, token, $"notateacher.{suffix}@example.com");

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{studentId}/approve");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ApproveTeacher_UnknownId_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        await SeedUserAsync("Approve", "AdminFour", $"approveadmin4.{suffix}@example.com", "AdminPass1!", "Admin");

        var token = await LoginAsync(client, $"approveadmin4.{suffix}@example.com", "AdminPass1!");

        var request = new HttpRequestMessage(HttpMethod.Patch, "/api/users/999999/approve");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ApproveTeacher_AsNonAdmin_ReturnsForbidden()
    {
        // Same story as GetUsers - the [Authorize(Roles = "Admin")] on the controller covers
        // every action in it, this endpoint included. Worth its own test anyway since it's the
        // one that actually changes data, not just reads it.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Approve", "AdminFive", $"approveadmin5.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Some", "Teacher", $"nonadmintarget.{suffix}@example.com", "TeacherPass1!", "Teacher", accountStatus: AccountStatus.Pending);
        await SeedUserAsync("Sneaky", "Student", $"sneakystudent.{suffix}@example.com", "StudentPass1!", "Student");

        var adminToken = await LoginAsync(client, $"approveadmin5.{suffix}@example.com", "AdminPass1!");
        var targetId = await FindUserIdAsync(client, adminToken, $"nonadmintarget.{suffix}@example.com");

        var studentToken = await LoginAsync(client, $"sneakystudent.{suffix}@example.com", "StudentPass1!");
        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{targetId}/approve");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteUser_AsAdmin_RemovesAStudentAccountFromTheDirectory()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var studentEmail = $"deleteme.{suffix}@example.com";

        await SeedUserAsync("Delete", "Admin", $"deleteadmin.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Delete", "Me", studentEmail, "StudentPass1!", "Student");

        var token = await LoginAsync(client, $"deleteadmin.{suffix}@example.com", "AdminPass1!");
        var studentId = await FindUserIdAsync(client, token, studentEmail);

        var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/users/{studentId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var directory = await GetUsersAsync(client, token, "?pageSize=1000");
        Assert.DoesNotContain(directory.Items, u => u.Email == studentEmail);
    }

    [Fact]
    public async Task DeleteUser_AsAdmin_RemovesAPendingTeacherAccount()
    {
        // Delete isn't limited to Active accounts - a Pending application an Admin never wants
        // to review can be removed outright instead of only Rejected.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherEmail = $"deletepending.{suffix}@example.com";

        await SeedUserAsync("Delete", "AdminTwo", $"deleteadmin2.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Delete", "PendingTeacher", teacherEmail, "TeacherPass1!", "Teacher", accountStatus: AccountStatus.Pending);

        var token = await LoginAsync(client, $"deleteadmin2.{suffix}@example.com", "AdminPass1!");
        var teacherId = await FindUserIdAsync(client, token, teacherEmail);

        var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/users/{teacherId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteUser_RemovesTheirTeacherSubjectsToo()
    {
        // TeacherSubject.TeacherId cascades on delete (see AppDbContext) - proven here directly
        // rather than just trusting the FK config, since an unhandled FK-constraint error would
        // otherwise surface as a raw 500 instead of a clean 204.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherEmail = $"deletewithSubjects.{suffix}@example.com";

        await SeedUserAsync("Delete", "AdminThree", $"deleteadmin3.{suffix}@example.com", "AdminPass1!", "Admin");
        var teacherId = await SeedUserWithSubjectAsync(teacherEmail, "TeacherPass1!", $"Chemistry-{suffix}");

        var token = await LoginAsync(client, $"deleteadmin3.{suffix}@example.com", "AdminPass1!");

        var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/users/{teacherId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await context.TeacherSubjects.AnyAsync(ts => ts.TeacherId == teacherId));
    }

    [Fact]
    public async Task DeleteUser_OnAnAdminAccount_ReturnsBadRequestAndLeavesItInPlace()
    {
        // Delete is scoped to Student/Teacher only - even another Admin can't remove a fellow
        // Admin's account through this endpoint.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var targetEmail = $"deletetargetadmin.{suffix}@example.com";

        await SeedUserAsync("Delete", "AdminFour", $"deleteadmin4.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Delete", "TargetAdmin", targetEmail, "AdminPass1!", "Admin");

        var token = await LoginAsync(client, $"deleteadmin4.{suffix}@example.com", "AdminPass1!");
        var targetId = await FindUserIdAsync(client, token, targetEmail);

        var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/users/{targetId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var directory = await GetUsersAsync(client, token, "?pageSize=1000");
        Assert.Contains(directory.Items, u => u.Email == targetEmail);
    }

    [Fact]
    public async Task DeleteUser_UnknownId_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        await SeedUserAsync("Delete", "AdminFive", $"deleteadmin5.{suffix}@example.com", "AdminPass1!", "Admin");

        var token = await LoginAsync(client, $"deleteadmin5.{suffix}@example.com", "AdminPass1!");

        var request = new HttpRequestMessage(HttpMethod.Delete, "/api/users/999999");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteUser_AsNonAdmin_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var targetEmail = $"deletetarget2.{suffix}@example.com";

        await SeedUserAsync("Delete", "AdminSix", $"deleteadmin6.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Delete", "Target2", targetEmail, "StudentPass1!", "Student");
        await SeedUserAsync("Sneaky", "StudentFive", $"sneakystudent5.{suffix}@example.com", "StudentPass1!", "Student");

        var adminToken = await LoginAsync(client, $"deleteadmin6.{suffix}@example.com", "AdminPass1!");
        var targetId = await FindUserIdAsync(client, adminToken, targetEmail);

        var studentToken = await LoginAsync(client, $"sneakystudent5.{suffix}@example.com", "StudentPass1!");
        var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/users/{targetId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        // Never even reached the database - the account is still there.
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.True(await context.Users.AnyAsync(u => u.Email == targetEmail));
    }

    [Fact]
    public async Task DeleteUser_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.DeleteAsync("/api/users/1");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DeleteUser_TerminatesAnyExistingSessionImmediately()
    {
        // The deleted account's own row is gone entirely, not just its status flipped - proven
        // here the same way DeactivateUser_TerminatesTheirExistingSessionImmediately proves it:
        // the same still-unexpired token, same endpoint, no re-login, must now fail.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var targetEmail = $"deletesession.{suffix}@example.com";
        const string targetPassword = "StudentPass1!";

        await SeedUserAsync("Delete", "AdminSeven", $"deleteadmin7.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Delete", "SessionTarget", targetEmail, targetPassword, "Student");

        var targetToken = await LoginAsync(client, targetEmail, targetPassword);
        var operatorToken = await LoginAsync(client, $"deleteadmin7.{suffix}@example.com", "AdminPass1!");
        var targetId = await FindUserIdAsync(client, operatorToken, targetEmail);

        var deleteRequest = new HttpRequestMessage(HttpMethod.Delete, $"/api/users/{targetId}");
        deleteRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", operatorToken);
        var deleteResponse = await client.SendAsync(deleteRequest);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var afterRequest = new HttpRequestMessage(HttpMethod.Get, "/api/users");
        afterRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", targetToken);
        var afterResponse = await client.SendAsync(afterRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, afterResponse.StatusCode);
    }

    // Seeds a Teacher plus one TeacherSubject row declared against a freshly seeded Category, for
    // the cascade-delete test above. Returns the Teacher's id.
    private async Task<int> SeedUserWithSubjectAsync(string email, string password, string categoryName)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var teacher = new User
        {
            FirstName = "Teach",
            Email = email,
            Role = "Teacher",
            AuthProvider = "Local",
            IsEmailVerified = true,
            AccountStatus = AccountStatus.Active,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
        };
        var category = new Category { Name = categoryName, Description = "Seeded for DeleteUser cascade test." };
        context.Users.Add(teacher);
        context.Categories.Add(category);
        await context.SaveChangesAsync();
        context.TeacherSubjects.Add(new TeacherSubject { TeacherId = teacher.Id, CategoryId = category.Id });
        await context.SaveChangesAsync();
        return teacher.Id;
    }

    private async Task<int> FindUserIdAsync(HttpClient client, string adminToken, string email)
    {
        var directory = await GetUsersAsync(client, adminToken, "?pageSize=1000");
        return Assert.Single(directory.Items, u => u.Email == email).Id;
    }

    private async Task<PagedUsersResponseDto> GetUsersAsync(HttpClient client, string token, string queryString)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/users{queryString}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<PagedUsersResponseDto>())!;
    }

    private class UserSummaryDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    private class PagedUsersResponseDto
    {
        public List<UserSummaryDto> Items { get; set; } = new();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
    }
}


