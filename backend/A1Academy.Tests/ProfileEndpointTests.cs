using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using A1Academy.API.Data;
using A1Academy.API.Data.Models;
using A1Academy.Tests.Fixtures;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace A1Academy.Tests;

/// <summary>
/// Integration tests for GET /api/auth/me, exercised through the real ASP.NET Core pipeline (via
/// WebApplicationFactory) so [Authorize] actually runs - the real point of this ticket is that
/// any logged-in user can see their own details, not just that the controller method returns the
/// right shape when called directly.
/// </summary>
public class ProfileEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public ProfileEndpointTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task SeedUserAsync(string firstName, string? lastName, string email, string password, string role)
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
            AccountStatus = AccountStatus.Active,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
        });
        await context.SaveChangesAsync();
    }

    private async Task<string> LoginAsync(HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        return body.GetProperty("token").GetString()!;
    }

    private class ProfileDto
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }

    [Theory]
    [InlineData("Student")]
    [InlineData("Teacher")]
    [InlineData("Admin")]
    public async Task Me_AsAnyRole_ReturnsOwnNameEmailAndRole(string role)
    {
        // The acceptance criterion names Name/Email/Role explicitly, and this must work for
        // every role, not just Admins - unlike /api/users, this is a user looking at themselves.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"me.{role.ToLowerInvariant()}.{suffix}@example.com";
        const string password = "ProfilePass1!";

        await SeedUserAsync("Pat", "Lee", email, password, role);
        var token = await LoginAsync(client, email, password);

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var rawJson = await response.Content.ReadAsStringAsync();
        // Never leak auth internals through this endpoint, even accidentally.
        Assert.DoesNotContain("passwordHash", rawJson, StringComparison.OrdinalIgnoreCase);

        var profile = System.Text.Json.JsonSerializer.Deserialize<ProfileDto>(rawJson,
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
        Assert.Equal("Pat Lee", profile.Name);
        Assert.Equal(email, profile.Email);
        Assert.Equal(role, profile.Role);
    }

    [Fact]
    public async Task Me_WithNoLastName_ReturnsJustFirstName()
    {
        // LastName is optional at registration (see RegisterRequest) - the trimmed concatenation
        // shouldn't leave a trailing space when there's nothing to append.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"nolast.{suffix}@example.com";
        const string password = "ProfilePass1!";

        await SeedUserAsync("Solo", null, email, password, "Student");
        var token = await LoginAsync(client, email, password);

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.SendAsync(request);

        var profile = await response.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.Equal("Solo", profile!.Name);
    }

    [Fact]
    public async Task Me_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithTokenFromDeactivatedAccount_ReturnsUnauthorized()
    {
        // This endpoint sits behind the same JWT bearer pipeline as everything else, so it
        // inherits the "Immediate Session Termination" check for free - worth a regression test
        // here specifically, since a profile page is exactly the kind of place a just-deactivated
        // user would otherwise still be looking at their own (stale) details.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var targetEmail = $"medeactivated.{suffix}@example.com";
        const string targetPassword = "ProfilePass1!";

        await SeedUserAsync("SoonGone", "User", targetEmail, targetPassword, "Student");
        await SeedUserAsync("Operator", "Admin", $"meop.{suffix}@example.com", "AdminPass1!", "Admin");

        var targetToken = await LoginAsync(client, targetEmail, targetPassword);
        var operatorToken = await LoginAsync(client, $"meop.{suffix}@example.com", "AdminPass1!");

        var usersResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/users?pageSize=1000", operatorToken));
        var directory = await usersResponse.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var targetId = directory.GetProperty("items").EnumerateArray()
            .Single(u => u.GetProperty("email").GetString() == targetEmail)
            .GetProperty("id").GetInt32();

        var deactivateResponse = await client.SendAsync(Authorized(HttpMethod.Patch, $"/api/users/{targetId}/deactivate", operatorToken));
        Assert.Equal(HttpStatusCode.OK, deactivateResponse.StatusCode);

        var meResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/auth/me", targetToken));
        Assert.Equal(HttpStatusCode.Unauthorized, meResponse.StatusCode);
    }

    private static HttpRequestMessage Authorized(HttpMethod method, string url, string token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }
}
