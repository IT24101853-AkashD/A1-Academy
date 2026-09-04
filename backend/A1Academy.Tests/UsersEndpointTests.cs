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

        var users = JsonSerializer.Deserialize<List<UserSummaryDto>>(rawJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;

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

    private class UserSummaryDto
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }
}
