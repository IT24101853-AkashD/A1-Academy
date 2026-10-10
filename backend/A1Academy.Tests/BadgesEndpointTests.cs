using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;
using A1Academy.Tests.Fixtures;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace A1Academy.Tests;

public class BadgesEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private const string BaseUrl = "/api/teacher/badges";
    private readonly ApiWebApplicationFactory _factory;

    public BadgesEndpointTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<(string token, int userId)> LoginAsNewUserAsync(HttpClient client, string role)
    {
        var email = $"{role.ToLowerInvariant()}.award.{Guid.NewGuid():N}@example.com";
        const string password = "AwardPass1!";
        int userId;
        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = new User
            {
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                Role = role,
                FirstName = "Test",
                LastName = role,
                AccountStatus = AccountStatus.Active
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();
            userId = user.Id;
        }

        var loginRes = await client.PostAsJsonAsync("/api/auth/login", new { Email = email, Password = password });
        loginRes.EnsureSuccessStatusCode();
        var json = await loginRes.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        return (json.GetProperty("token").GetString()!, userId);
    }

    [Fact]
    public async Task GetMasterBadgeTemplates_AsTeacher_ReturnsTemplates()
    {
        var client = _factory.CreateClient();
        var loginResult = await LoginAsNewUserAsync(client, "Teacher");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginResult.token);

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            context.MasterBadgeTemplates.Add(new MasterBadgeTemplate { Name = "Star", Criteria = "Being a star" });
            await context.SaveChangesAsync();
        }

        var res = await client.GetAsync($"{BaseUrl}/templates");
        res.EnsureSuccessStatusCode();
        
        var templates = await res.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.True(templates.GetArrayLength() >= 1);
    }

    [Fact]
    public async Task AwardBadge_ValidData_ReturnsSuccess()
    {
        var client = _factory.CreateClient();
        var teacherLogin = await LoginAsNewUserAsync(client, "Teacher");
        var studentLogin = await LoginAsNewUserAsync(client, "Student");
        
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", teacherLogin.token);

        int templateId;
        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var template = new MasterBadgeTemplate { Name = "Super Star", Criteria = "Amazing work" };
            context.MasterBadgeTemplates.Add(template);
            
            var category = new Category { Name = "Test Category" };
            context.Categories.Add(category);
            await context.SaveChangesAsync();

            var classObj = new Class 
            { 
                Name = "Test Class",
                CategoryId = category.Id, 
                TeacherId = teacherLogin.userId, 
                ScheduledAt = DateTime.UtcNow.AddMonths(1),
                Capacity = 10,
                Status = ClassStatus.Active
            };
            classObj.BumpConcurrencyStamp();
            context.Classes.Add(classObj);
            await context.SaveChangesAsync();

            context.Enrollments.Add(new Enrollment { ClassId = classObj.Id, StudentId = studentLogin.userId, EnrolledAt = DateTime.UtcNow });
            await context.SaveChangesAsync();
            
            templateId = template.Id;
        }

        var res = await client.PostAsJsonAsync($"{BaseUrl}/award", new
        {
            StudentId = studentLogin.userId,
            MasterBadgeTemplateId = templateId,
            Comments = "Excellent job!"
        });

        res.EnsureSuccessStatusCode();
    }
}
