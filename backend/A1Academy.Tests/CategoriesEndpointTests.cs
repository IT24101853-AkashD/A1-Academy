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
/// Integration tests for /api/categories, exercised through the real ASP.NET Core pipeline so
/// [Authorize] and [Authorize(Roles = "Admin")] actually run.
/// </summary>
public class CategoriesEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public CategoriesEndpointTests(ApiWebApplicationFactory factory)
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

    private class CategoryDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    [Fact]
    public async Task CreateCategory_AsAdmin_SavesItAndMakesItImmediatelyAvailable()
    {
        // Scenario 1 - Successful Category Creation. "Immediately available for class
        // scheduling" is proven directly here: a separate GET (both the list and by-id) right
        // after creation, not just trusting the POST's own response.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var name = $"Mathematics-{suffix}";

        await SeedUserAsync("Cat", $"catadmin.{suffix}@example.com", "AdminPass1!", "Admin");
        var token = await LoginAsync(client, $"catadmin.{suffix}@example.com", "AdminPass1!");

        var createRequest = Authorized(HttpMethod.Post, "/api/categories", token);
        createRequest.Content = JsonContent.Create(new { name, description = "Algebra, calculus, and geometry." });
        var createResponse = await client.SendAsync(createRequest);

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<CategoryDto>();
        Assert.Equal(name, created!.Name);
        Assert.Equal("Algebra, calculus, and geometry.", created.Description);
        Assert.True(created.Id > 0);

        // Immediately visible in the list...
        var listResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/categories", token));
        var list = await listResponse.Content.ReadFromJsonAsync<List<CategoryDto>>();
        Assert.Contains(list!, c => c.Name == name);

        // ...and by id, at the Location the 201 response pointed to. Routing is case-insensitive
        // ([controller] in the template reflects the literal class name "Categories"), so the
        // comparison is too.
        Assert.Contains($"/api/categories/{created.Id}", createResponse.Headers.Location!.ToString(), StringComparison.OrdinalIgnoreCase);
        var byIdResponse = await client.SendAsync(Authorized(HttpMethod.Get, $"/api/categories/{created.Id}", token));
        Assert.Equal(HttpStatusCode.OK, byIdResponse.StatusCode);
    }

    [Theory]
    [InlineData("Student")]
    [InlineData("Teacher")]
    public async Task CreateCategory_AsNonAdmin_ReturnsForbidden(string role)
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"catnonadmin.{role.ToLowerInvariant()}.{suffix}@example.com";

        await SeedUserAsync("NonAdmin", email, "Pass1!", role);
        var token = await LoginAsync(client, email, "Pass1!");

        var request = Authorized(HttpMethod.Post, "/api/categories", token);
        request.Content = JsonContent.Create(new { name = $"ShouldNotSave-{suffix}", description = "Nope." });
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        var listResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/categories", token));
        var list = await listResponse.Content.ReadFromJsonAsync<List<CategoryDto>>();
        Assert.DoesNotContain(list!, c => c.Name == $"ShouldNotSave-{suffix}");
    }

    [Fact]
    public async Task CreateCategory_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/categories")
        {
            Content = JsonContent.Create(new { name = "Nope", description = "Nope." })
        };
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateCategory_WithBlankName_ReturnsBadRequestAndDoesNotSave()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        await SeedUserAsync("Cat", $"blankname.{suffix}@example.com", "AdminPass1!", "Admin");
        var token = await LoginAsync(client, $"blankname.{suffix}@example.com", "AdminPass1!");

        var request = Authorized(HttpMethod.Post, "/api/categories", token);
        request.Content = JsonContent.Create(new { name = "   ", description = "A description." });
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateCategory_WithBlankDescription_ReturnsBadRequestAndDoesNotSave()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        await SeedUserAsync("Cat", $"blankdesc.{suffix}@example.com", "AdminPass1!", "Admin");
        var token = await LoginAsync(client, $"blankdesc.{suffix}@example.com", "AdminPass1!");

        var request = Authorized(HttpMethod.Post, "/api/categories", token);
        request.Content = JsonContent.Create(new { name = $"NeedsDescription-{suffix}", description = "" });
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var listResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/categories", token));
        var list = await listResponse.Content.ReadFromJsonAsync<List<CategoryDto>>();
        Assert.DoesNotContain(list!, c => c.Name == $"NeedsDescription-{suffix}");
    }

    [Fact]
    public async Task CreateCategory_WithDuplicateName_ReturnsBadRequestCaseInsensitively()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var name = $"Science-{suffix}";
        await SeedUserAsync("Cat", $"dupe.{suffix}@example.com", "AdminPass1!", "Admin");
        var token = await LoginAsync(client, $"dupe.{suffix}@example.com", "AdminPass1!");

        var firstRequest = Authorized(HttpMethod.Post, "/api/categories", token);
        firstRequest.Content = JsonContent.Create(new { name, description = "First one." });
        var firstResponse = await client.SendAsync(firstRequest);
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

        var duplicateRequest = Authorized(HttpMethod.Post, "/api/categories", token);
        // Different case, and different whitespace - still the same category name to a human.
        duplicateRequest.Content = JsonContent.Create(new { name = $"  {name.ToUpperInvariant()}  ", description = "A second attempt." });
        var duplicateResponse = await client.SendAsync(duplicateRequest);

        Assert.Equal(HttpStatusCode.BadRequest, duplicateResponse.StatusCode);

        var listResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/categories", token));
        var list = await listResponse.Content.ReadFromJsonAsync<List<CategoryDto>>();
        Assert.Single(list!, c => c.Name == name);
    }

    [Fact]
    public async Task GetCategories_AsTeacher_ReturnsOk()
    {
        // Reading the list isn't Admin-only - Teachers need it to pick a category for their
        // classes, which is the whole reason this ticket exists.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        await SeedUserAsync("Teach", $"catteacher.{suffix}@example.com", "TeacherPass1!", "Teacher");
        var token = await LoginAsync(client, $"catteacher.{suffix}@example.com", "TeacherPass1!");

        var response = await client.SendAsync(Authorized(HttpMethod.Get, "/api/categories", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetCategories_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/categories");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetCategoryById_UnknownId_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        await SeedUserAsync("Cat", $"notfound.{suffix}@example.com", "AdminPass1!", "Admin");
        var token = await LoginAsync(client, $"notfound.{suffix}@example.com", "AdminPass1!");

        var response = await client.SendAsync(Authorized(HttpMethod.Get, "/api/categories/999999", token));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
