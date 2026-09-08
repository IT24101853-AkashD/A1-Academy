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
        public string FirstName { get; set; } = string.Empty;
        public string? LastName { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
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
    public async Task UpdateMe_WithValidFields_UpdatesNameAndPhoneAndPersists()
    {
        // Scenario 1 - Successful Profile Update: name and contact info change, and the change
        // sticks (verified with a separate follow-up GET, not just trusting the PUT's response).
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"editme.{suffix}@example.com";
        const string password = "ProfilePass1!";

        await SeedUserAsync("Original", "Name", email, password, "Student");
        var token = await LoginAsync(client, email, password);

        var putRequest = Authorized(HttpMethod.Put, "/api/auth/me", token);
        putRequest.Content = JsonContent.Create(new { firstName = "Updated", lastName = "Person", phoneNumber = "+1 555-0100" });
        var putResponse = await client.SendAsync(putRequest);

        Assert.Equal(HttpStatusCode.OK, putResponse.StatusCode);
        var updated = await putResponse.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.Equal("Updated Person", updated!.Name);
        Assert.Equal("+1 555-0100", updated.PhoneNumber);
        // Untouched fields stay untouched - this isn't a full replace of the account.
        Assert.Equal(email, updated.Email);
        Assert.Equal("Student", updated.Role);

        var getResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/auth/me", token));
        var reloaded = await getResponse.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.Equal("Updated Person", reloaded!.Name);
        Assert.Equal("+1 555-0100", reloaded.PhoneNumber);
    }

    [Fact]
    public async Task UpdateMe_OmittingLastNameAndPhone_ClearsThem()
    {
        // Both are optional contact/display fields - an update that leaves them out is the
        // user clearing them, not a partial update that leaves the old values dangling.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"clearfields.{suffix}@example.com";
        const string password = "ProfilePass1!";

        await SeedUserAsync("Has", "Everything", email, password, "Student");
        var token = await LoginAsync(client, email, password);
        await client.SendAsync(new HttpRequestMessage(HttpMethod.Put, "/api/auth/me")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) },
            Content = JsonContent.Create(new { firstName = "Has", lastName = "Everything", phoneNumber = "555-0100" })
        });

        var clearRequest = Authorized(HttpMethod.Put, "/api/auth/me", token);
        clearRequest.Content = JsonContent.Create(new { firstName = "JustFirst" });
        var response = await client.SendAsync(clearRequest);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.Equal("JustFirst", updated!.Name);
        Assert.Null(updated.LastName);
        Assert.Null(updated.PhoneNumber);
    }

    [Fact]
    public async Task UpdateMe_WithBlankFirstName_ReturnsBadRequestAndLeavesRecordUnchanged()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"blankfirst.{suffix}@example.com";
        const string password = "ProfilePass1!";

        await SeedUserAsync("Keep", "Me", email, password, "Student");
        var token = await LoginAsync(client, email, password);

        var request = Authorized(HttpMethod.Put, "/api/auth/me", token);
        request.Content = JsonContent.Create(new { firstName = "   " });
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var getResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/auth/me", token));
        var profile = await getResponse.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.Equal("Keep Me", profile!.Name);
    }

    [Fact]
    public async Task UpdateMe_WithInvalidPhoneNumber_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"badphone.{suffix}@example.com";
        const string password = "ProfilePass1!";

        await SeedUserAsync("Some", "Person", email, password, "Student");
        var token = await LoginAsync(client, email, password);

        var request = Authorized(HttpMethod.Put, "/api/auth/me", token);
        request.Content = JsonContent.Create(new { firstName = "Some", phoneNumber = "not-a-phone-number!!" });
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateMe_WithOverlongFirstName_ReturnsBadRequestInsteadOfServerError()
    {
        // Regression test: User.FirstName is capped at 50 chars at the database column level
        // (character varying(50)) - without an application-level check ahead of it, a longer
        // value sails past every other check here and only fails once SaveChangesAsync reaches
        // Postgres, surfacing as an unhandled 500 instead of a clean 400.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"longfirst.{suffix}@example.com";
        const string password = "ProfilePass1!";

        await SeedUserAsync("Original", "Name", email, password, "Student");
        var token = await LoginAsync(client, email, password);

        var request = Authorized(HttpMethod.Put, "/api/auth/me", token);
        request.Content = JsonContent.Create(new { firstName = new string('X', 51) });
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var getResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/auth/me", token));
        var profile = await getResponse.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.Equal("Original Name", profile!.Name);
    }

    [Fact]
    public async Task UpdateMe_WithOverlongLastName_ReturnsBadRequestInsteadOfServerError()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"longlast.{suffix}@example.com";
        const string password = "ProfilePass1!";

        await SeedUserAsync("Original", "Name", email, password, "Student");
        var token = await LoginAsync(client, email, password);

        var request = Authorized(HttpMethod.Put, "/api/auth/me", token);
        request.Content = JsonContent.Create(new { firstName = "Original", lastName = new string('Y', 51) });
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateMe_WithFirstNameAtExactly50Characters_Succeeds()
    {
        // The boundary itself is valid - only strictly over the column limit should be rejected.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"exactfifty.{suffix}@example.com";
        const string password = "ProfilePass1!";

        await SeedUserAsync("Original", "Name", email, password, "Student");
        var token = await LoginAsync(client, email, password);

        var request = Authorized(HttpMethod.Put, "/api/auth/me", token);
        var exactlyFifty = new string('Z', 50);
        request.Content = JsonContent.Create(new { firstName = exactlyFifty });
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.Equal(exactlyFifty, profile!.FirstName);
    }

    [Fact]
    public async Task UpdateMe_CannotModifyAnotherUsersProfile()
    {
        // Scenario 2 - Prevent Cross-User Modification. The strongest version of this test isn't
        // "a spoofed id in the body gets rejected" - PUT /api/auth/me has no id field on
        // UpdateProfileRequest at all, so there is nothing to spoof. This proves that directly:
        // even a request body carrying extra JSON properties that look like an attempt to target
        // someone else only ever changes the caller's own record, and the victim's record is
        // completely untouched.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var attackerEmail = $"attacker.{suffix}@example.com";
        var victimEmail = $"victim.{suffix}@example.com";
        const string password = "ProfilePass1!";

        await SeedUserAsync("Attacker", "Original", attackerEmail, password, "Student");
        await SeedUserAsync("Victim", "Original", victimEmail, password, "Student");

        var attackerToken = await LoginAsync(client, attackerEmail, password);
        var victimToken = await LoginAsync(client, victimEmail, password);

        // Fetch the victim's id (as the victim would only reveal to an Admin's directory in
        // reality, but the point here is that even knowing it does the attacker no good).
        var meResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/auth/me", victimToken));
        var victimProfile = await meResponse.Content.ReadFromJsonAsync<ProfileDto>();

        var attackRequest = Authorized(HttpMethod.Put, "/api/auth/me", attackerToken);
        // Extra properties an attacker might hope get bound onto some id/userId parameter the
        // endpoint doesn't have - UpdateProfileRequest only has FirstName/LastName/PhoneNumber,
        // so System.Text.Json's default model binding just ignores anything else in the body.
        attackRequest.Content = JsonContent.Create(new
        {
            firstName = "Hacked",
            lastName = "TheVictim",
            userId = "not-the-attackers-id",
            id = 999999,
            email = victimEmail
        });
        var attackResponse = await client.SendAsync(attackRequest);
        Assert.Equal(HttpStatusCode.OK, attackResponse.StatusCode);

        // The attacker's own record changed - that part of the request was legitimate...
        var attackerProfile = await attackResponse.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.Equal("Hacked TheVictim", attackerProfile!.Name);
        Assert.Equal(attackerEmail, attackerProfile.Email);

        // ...but the victim's record is completely untouched.
        var victimAfter = await client.SendAsync(Authorized(HttpMethod.Get, "/api/auth/me", victimToken));
        var victimProfileAfter = await victimAfter.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.Equal(victimProfile!.Name, victimProfileAfter!.Name);
        Assert.Equal("Victim Original", victimProfileAfter.Name);
    }

    [Fact]
    public async Task UpdateMe_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var request = new HttpRequestMessage(HttpMethod.Put, "/api/auth/me")
        {
            Content = JsonContent.Create(new { firstName = "Nobody" })
        };
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
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
