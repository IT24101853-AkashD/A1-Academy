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
/// Integration tests for /api/admin/badges - the Admin-only CRUD for master badge templates.
/// Run through the real pipeline so [Authorize(Roles = "Admin")] and model validation apply.
/// </summary>
public class MasterBadgeTemplatesEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private const string BaseUrl = "/api/admin/badges";
    private readonly ApiWebApplicationFactory _factory;

    public MasterBadgeTemplatesEndpointTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private class BadgeDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? IconName { get; set; }
        public string Criteria { get; set; } = string.Empty;
    }

    private async Task<string> LoginAsNewUserAsync(HttpClient client, string role)
    {
        var email = $"{role.ToLowerInvariant()}.badges.{Guid.NewGuid():N}@example.com";
        const string password = "BadgesPass1!";
        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            context.Users.Add(new User
            {
                FirstName = role,
                Email = email,
                Role = role,
                AuthProvider = "Local",
                IsEmailVerified = true,
                AccountStatus = AccountStatus.Active,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
            });
            await context.SaveChangesAsync();
        }

        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        return body.GetProperty("token").GetString()!;
    }

    private static HttpRequestMessage Request(HttpMethod method, string url, string? token, object? body = null)
    {
        var request = new HttpRequestMessage(method, url);
        if (token != null)
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
        if (body != null)
        {
            request.Content = JsonContent.Create(body);
        }
        return request;
    }

    private async Task<BadgeDto> CreateBadgeAsync(HttpClient client, string adminToken, string name)
    {
        var response = await client.SendAsync(Request(HttpMethod.Post, BaseUrl, adminToken,
            new { name, iconName = "star", criteria = "Submit 5 assignments on time" }));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<BadgeDto>())!;
    }

    [Fact]
    public async Task GetBadges_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _factory.CreateClient().GetAsync(BaseUrl);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("Student")]
    [InlineData("Teacher")]
    public async Task BadgeEndpoints_AsNonAdmin_AreForbidden(string role)
    {
        var client = _factory.CreateClient();
        var token = await LoginAsNewUserAsync(client, role);

        var list = await client.SendAsync(Request(HttpMethod.Get, BaseUrl, token));
        var create = await client.SendAsync(Request(HttpMethod.Post, BaseUrl, token,
            new { name = "Sneaky", criteria = "Should not be created" }));

        Assert.Equal(HttpStatusCode.Forbidden, list.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, create.StatusCode);
    }

    [Fact]
    public async Task CreateBadge_AsAdmin_ReturnsCreatedAndIsListedAndFetchable()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsNewUserAsync(client, "Admin");
        var name = $"Early Bird {Guid.NewGuid():N}"[..20];

        var created = await CreateBadgeAsync(client, token, name);

        Assert.True(created.Id > 0);
        Assert.Equal(name, created.Name);
        Assert.Equal("star", created.IconName);

        var fetched = await client.SendAsync(Request(HttpMethod.Get, $"{BaseUrl}/{created.Id}", token));
        Assert.Equal(HttpStatusCode.OK, fetched.StatusCode);
        Assert.Equal("Submit 5 assignments on time", (await fetched.Content.ReadFromJsonAsync<BadgeDto>())!.Criteria);

        var list = await client.SendAsync(Request(HttpMethod.Get, BaseUrl, token));
        var badges = (await list.Content.ReadFromJsonAsync<List<BadgeDto>>())!;
        Assert.Contains(badges, b => b.Id == created.Id && b.Name == name);
    }

    [Fact]
    public async Task CreateBadge_WithoutNameOrCriteria_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsNewUserAsync(client, "Admin");

        var response = await client.SendAsync(Request(HttpMethod.Post, BaseUrl, token,
            new { name = "", criteria = "" }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateBadge_AsAdmin_ChangesItsFields()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsNewUserAsync(client, "Admin");
        var created = await CreateBadgeAsync(client, token, "Before Update");

        var update = await client.SendAsync(Request(HttpMethod.Put, $"{BaseUrl}/{created.Id}", token,
            new { name = "After Update", iconName = "trophy", criteria = "Top grade in a class" }));

        Assert.Equal(HttpStatusCode.NoContent, update.StatusCode);
        var fetched = (await (await client.SendAsync(Request(HttpMethod.Get, $"{BaseUrl}/{created.Id}", token)))
            .Content.ReadFromJsonAsync<BadgeDto>())!;
        Assert.Equal("After Update", fetched.Name);
        Assert.Equal("trophy", fetched.IconName);
        Assert.Equal("Top grade in a class", fetched.Criteria);
    }

    [Fact]
    public async Task DeleteBadge_AsAdmin_RemovesIt()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsNewUserAsync(client, "Admin");
        var created = await CreateBadgeAsync(client, token, "To Be Deleted");

        var delete = await client.SendAsync(Request(HttpMethod.Delete, $"{BaseUrl}/{created.Id}", token));
        var fetchAfter = await client.SendAsync(Request(HttpMethod.Get, $"{BaseUrl}/{created.Id}", token));

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, fetchAfter.StatusCode);
    }

    [Fact]
    public async Task BadgeEndpoints_ForUnknownId_ReturnNotFound()
    {
        var client = _factory.CreateClient();
        var token = await LoginAsNewUserAsync(client, "Admin");
        const string missing = BaseUrl + "/987654";

        var get = await client.SendAsync(Request(HttpMethod.Get, missing, token));
        var put = await client.SendAsync(Request(HttpMethod.Put, missing, token,
            new { name = "Ghost", criteria = "Does not exist" }));
        var delete = await client.SendAsync(Request(HttpMethod.Delete, missing, token));

        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, put.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
    }
}
