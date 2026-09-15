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
/// Integration tests for /api/teacher/subjects, exercised through the real ASP.NET Core
/// pipeline so [Authorize(Roles = "Teacher")] actually runs - mirrors CategoriesEndpointTests'
/// style since this feature is a Teacher-facing companion to that controller.
/// </summary>
public class TeacherSubjectsEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public TeacherSubjectsEndpointTests(ApiWebApplicationFactory factory)
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

    // Seeded directly rather than through /api/categories - the category's content isn't the
    // point of these tests, only that a real id exists for the teacher to register against.
    private async Task<int> SeedCategoryAsync(string name)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var category = new Category { Name = name, Description = "Seeded for TeacherSubjects tests." };
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

    private static HttpRequestMessage RegisterRequest(string token, params int[] categoryIds)
    {
        var request = Authorized(HttpMethod.Post, "/api/teacher/subjects", token);
        request.Content = JsonContent.Create(new { categoryIds });
        return request;
    }

    private class TeacherSubjectDto
    {
        public int CategoryId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    [Fact]
    public async Task GetMySubjects_BeforeRegistering_ReturnsEmptyList()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"teacher.empty.{suffix}@example.com";
        await SeedUserAsync("Teach", email, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, email, "TeachPass1!");

        var response = await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher/subjects", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var list = await response.Content.ReadFromJsonAsync<List<TeacherSubjectDto>>();
        Assert.Empty(list!);
    }

    [Fact]
    public async Task RegisterMySubjects_WithValidCategories_SavesThemAndTheyReadBackImmediately()
    {
        // Scenario 1 - a Teacher registers the subject(s) they teach, and a separate GET (not
        // just the POST's own response) proves the selection actually persisted.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"teacher.select.{suffix}@example.com";
        await SeedUserAsync("Teach", email, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, email, "TeachPass1!");

        var mathId = await SeedCategoryAsync($"Mathematics-{suffix}");
        var scienceId = await SeedCategoryAsync($"Science-{suffix}");

        var postResponse = await client.SendAsync(RegisterRequest(token, mathId, scienceId));

        Assert.Equal(HttpStatusCode.OK, postResponse.StatusCode);
        var saved = await postResponse.Content.ReadFromJsonAsync<List<TeacherSubjectDto>>();
        Assert.Equal(2, saved!.Count);

        var getResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher/subjects", token));
        var fetched = await getResponse.Content.ReadFromJsonAsync<List<TeacherSubjectDto>>();
        Assert.Equal(2, fetched!.Count);
        Assert.Contains(fetched, s => s.CategoryId == mathId);
        Assert.Contains(fetched, s => s.CategoryId == scienceId);
    }

    // A Category an Administrator adds after a Teacher last checked shows up on the very next
    // GET /api/categories fetch - proven here directly, rather than just asserted in a comment,
    // since it's the mechanism the "select from whatever admin has added, including anything
    // added later" requirement depends on.
    [Fact]
    public async Task NewlyAddedCategory_IsImmediatelySelectableByATeacherWhoHasNotYetRegistered()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherEmail = $"teacher.newcat.{suffix}@example.com";
        var adminEmail = $"admin.newcat.{suffix}@example.com";
        await SeedUserAsync("Teach", teacherEmail, "TeachPass1!", "Teacher");
        await SeedUserAsync("Admin", adminEmail, "AdminPass1!", "Admin");
        var teacherToken = await LoginAsync(client, teacherEmail, "TeachPass1!");
        var adminToken = await LoginAsync(client, adminEmail, "AdminPass1!");

        // Admin adds a brand new category through the real endpoint, not seeded directly - this
        // is the exact path a live admin action would take.
        var createRequest = Authorized(HttpMethod.Post, "/api/categories", adminToken);
        var name = $"Geography-{suffix}";
        createRequest.Content = JsonContent.Create(new { name, description = "Added after the teacher last looked." });
        var createResponse = await client.SendAsync(createRequest);
        var created = await createResponse.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var newCategoryId = created.GetProperty("id").GetInt32();

        // The teacher's own catalogue fetch sees it without any special refresh step.
        var catalogueResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/categories", teacherToken));
        var catalogueBody = await catalogueResponse.Content.ReadAsStringAsync();
        Assert.Contains(name, catalogueBody);

        // ...and it's a valid choice to register against.
        var registerResponse = await client.SendAsync(RegisterRequest(teacherToken, newCategoryId));
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);
    }

    [Fact]
    public async Task RegisterMySubjects_CalledASecondTime_ReturnsConflictAndLeavesTheOriginalSelectionUnchanged()
    {
        // The core of this feature: registration is one-time. A second attempt is rejected even
        // when it names a completely different, otherwise-valid subject - it isn't a matter of
        // what the new request contains, only that a first registration already happened.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"teacher.locked.{suffix}@example.com";
        await SeedUserAsync("Teach", email, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, email, "TeachPass1!");

        var mathId = await SeedCategoryAsync($"Mathematics-{suffix}");
        var artId = await SeedCategoryAsync($"Art-{suffix}");

        var firstResponse = await client.SendAsync(RegisterRequest(token, mathId));
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        var secondResponse = await client.SendAsync(RegisterRequest(token, artId));
        Assert.Equal(HttpStatusCode.Conflict, secondResponse.StatusCode);

        var fetched = await (await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher/subjects", token)))
            .Content.ReadFromJsonAsync<List<TeacherSubjectDto>>();
        Assert.Single(fetched!);
        Assert.Equal(mathId, fetched![0].CategoryId);
    }

    [Fact]
    public async Task RegisterMySubjects_WithEmptySelection_ReturnsBadRequestAndDoesNotCountAsRegistering()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"teacher.emptyreg.{suffix}@example.com";
        await SeedUserAsync("Teach", email, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, email, "TeachPass1!");

        var emptyResponse = await client.SendAsync(RegisterRequest(token));
        Assert.Equal(HttpStatusCode.BadRequest, emptyResponse.StatusCode);

        // Since the empty attempt didn't count as registering, a real one right after still
        // succeeds instead of being turned away as "already registered".
        var mathId = await SeedCategoryAsync($"Mathematics-{suffix}");
        var realResponse = await client.SendAsync(RegisterRequest(token, mathId));
        Assert.Equal(HttpStatusCode.OK, realResponse.StatusCode);
    }

    [Fact]
    public async Task RegisterMySubjects_WithUnknownCategoryId_ReturnsBadRequestAndSavesNothing()
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"teacher.badid.{suffix}@example.com";
        await SeedUserAsync("Teach", email, "TeachPass1!", "Teacher");
        var token = await LoginAsync(client, email, "TeachPass1!");

        var response = await client.SendAsync(RegisterRequest(token, 999999));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var getResponse = await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher/subjects", token));
        var fetched = await getResponse.Content.ReadFromJsonAsync<List<TeacherSubjectDto>>();
        Assert.Empty(fetched!);
    }

    [Theory]
    [InlineData("Student")]
    [InlineData("Admin")]
    public async Task Subjects_AsNonTeacher_ReturnsForbidden(string role)
    {
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"nonteacher.{role.ToLowerInvariant()}.{suffix}@example.com";
        await SeedUserAsync("NonTeacher", email, "Pass1!", role);
        var token = await LoginAsync(client, email, "Pass1!");

        var response = await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher/subjects", token));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Subjects_Unauthenticated_ReturnsUnauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.SendAsync(new HttpRequestMessage(HttpMethod.Get, "/api/teacher/subjects"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task RegisterMySubjects_DoesNotAffectAnotherTeachersSelection()
    {
        // Cross-user isolation, the same property AA-29 established for profile edits: nothing
        // in this endpoint ever takes a teacher id as input, so there's no way for one teacher's
        // registration to touch another's rows - or another teacher's registration to lock this
        // one out.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var emailA = $"teacher.a.{suffix}@example.com";
        var emailB = $"teacher.b.{suffix}@example.com";
        await SeedUserAsync("TeachA", emailA, "TeachPass1!", "Teacher");
        await SeedUserAsync("TeachB", emailB, "TeachPass1!", "Teacher");
        var tokenA = await LoginAsync(client, emailA, "TeachPass1!");
        var tokenB = await LoginAsync(client, emailB, "TeachPass1!");

        var mathId = await SeedCategoryAsync($"Mathematics-{suffix}");

        await client.SendAsync(RegisterRequest(tokenA, mathId));

        var getB = await client.SendAsync(Authorized(HttpMethod.Get, "/api/teacher/subjects", tokenB));
        var teacherBList = await getB.Content.ReadFromJsonAsync<List<TeacherSubjectDto>>();
        Assert.Empty(teacherBList!);

        // Teacher B is still free to register - Teacher A's registration didn't lock the feature
        // globally, only Teacher A's own row.
        var scienceId = await SeedCategoryAsync($"Science-{suffix}");
        var registerB = await client.SendAsync(RegisterRequest(tokenB, scienceId));
        Assert.Equal(HttpStatusCode.OK, registerB.StatusCode);
    }

    [Fact]
    public async Task DeleteCategory_WithATeacherSubjectRegistrationAttached_ReturnsConflict()
    {
        // The delete-guard extension in CategoriesController: a category a teacher has
        // registered for is treated the same as one with active classes attached - 409, not a
        // raw FK-constraint 500.
        var client = _factory.CreateClient();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherEmail = $"teacher.blocker.{suffix}@example.com";
        var adminEmail = $"admin.blocker.{suffix}@example.com";
        await SeedUserAsync("Teach", teacherEmail, "TeachPass1!", "Teacher");
        await SeedUserAsync("Admin", adminEmail, "AdminPass1!", "Admin");
        var teacherToken = await LoginAsync(client, teacherEmail, "TeachPass1!");
        var adminToken = await LoginAsync(client, adminEmail, "AdminPass1!");

        var categoryId = await SeedCategoryAsync($"Physics-{suffix}");

        await client.SendAsync(RegisterRequest(teacherToken, categoryId));

        var deleteResponse = await client.SendAsync(
            Authorized(HttpMethod.Delete, $"/api/categories/{categoryId}", adminToken));

        Assert.Equal(HttpStatusCode.Conflict, deleteResponse.StatusCode);
    }
}


