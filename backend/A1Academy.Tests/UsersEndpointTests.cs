using System.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using A1Academy.API.Data;
using A1Academy.API.Data.Models;
using A1Academy.Tests.Fixtures;
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

    private async Task SeedUserAsync(string firstName, string lastName, string email, string password, string role, bool isApproved = true)
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
            IsApproved = isApproved,
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
        await SeedUserAsync("Jane", "Smith", $"jane.{suffix}@example.com", "TeacherPass1!", "Teacher", isApproved: true);
        await SeedUserAsync("Pending", "Teacher", $"pending.{suffix}@example.com", "TeacherPass1!", "Teacher", isApproved: false);

        var token = await LoginAsync(client, $"ada.{suffix}@example.com", "AdminPass1!");
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/users");
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
        await SeedUserAsync("Teacher", "User", email, "TeacherPass1!", "Teacher", isApproved: true);

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
        await SeedUserAsync("Approved", "Teacher", $"approvedteacher.{suffix}@example.com", "TeacherPass1!", "Teacher", isApproved: true);
        await SeedUserAsync("Pending", "TeacherOne", $"pendingteacher1.{suffix}@example.com", "TeacherPass1!", "Teacher", isApproved: false);
        await SeedUserAsync("Pending", "TeacherTwo", $"pendingteacher2.{suffix}@example.com", "TeacherPass1!", "Teacher", isApproved: false);
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
        await SeedUserAsync("Approved", "Teacher", $"roleapproved.{suffix}@example.com", "TeacherPass1!", "Teacher", isApproved: true);
        await SeedUserAsync("Pending", "Teacher", $"rolepending.{suffix}@example.com", "TeacherPass1!", "Teacher", isApproved: false);
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
        await SeedUserAsync("Pending", "Teacher", $"statuspending.{suffix}@example.com", "TeacherPass1!", "Teacher", isApproved: false);
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
        await SeedUserAsync("Grace", "Green", $"gracegreen.{suffix}@example.com", "TeacherPass1!", "Teacher", isApproved: false);

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
        await SeedUserAsync("Unblock", "Teacher", teacherEmail, teacherPassword, "Teacher", isApproved: false);

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
    public async Task ApproveTeacher_AlreadyApproved_IsANoOpAndStillReturnsOk()
    {
        // An admin double-clicking Approve (or two admins racing on the same stale page)
        // shouldn't error out - the teacher is Active either way.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        await SeedUserAsync("Approve", "AdminTwo", $"approveadmin2.{suffix}@example.com", "AdminPass1!", "Admin");
        await SeedUserAsync("Already", "Approved", $"alreadyapproved.{suffix}@example.com", "TeacherPass1!", "Teacher", isApproved: true);

        var token = await LoginAsync(client, $"approveadmin2.{suffix}@example.com", "AdminPass1!");
        var teacherId = await FindUserIdAsync(client, token, $"alreadyapproved.{suffix}@example.com");

        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{teacherId}/approve");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.Content.ReadFromJsonAsync<UserSummaryDto>())!;
        Assert.Equal("Active", updated.Status);
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
        await SeedUserAsync("Some", "Teacher", $"nonadmintarget.{suffix}@example.com", "TeacherPass1!", "Teacher", isApproved: false);
        await SeedUserAsync("Sneaky", "Student", $"sneakystudent.{suffix}@example.com", "StudentPass1!", "Student");

        var adminToken = await LoginAsync(client, $"approveadmin5.{suffix}@example.com", "AdminPass1!");
        var targetId = await FindUserIdAsync(client, adminToken, $"nonadmintarget.{suffix}@example.com");

        var studentToken = await LoginAsync(client, $"sneakystudent.{suffix}@example.com", "StudentPass1!");
        var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/users/{targetId}/approve");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", studentToken);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
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
