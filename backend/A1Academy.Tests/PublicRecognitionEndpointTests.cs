using System.Net.Http.Json;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;
using A1Academy.Tests.Fixtures;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace A1Academy.Tests;

public class PublicRecognitionEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private const string BaseUrl = "/api/recognition/board";
    private readonly ApiWebApplicationFactory _factory;

    public PublicRecognitionEndpointTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetPublicRecognitionBoard_ReturnsBadges()
    {
        var client = _factory.CreateClient();

        using (var scope = _factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var student = new User { Email = "student.board@example.com", PasswordHash = "...", Role = "Student", FirstName = "S", LastName = "B", AccountStatus = AccountStatus.Active };
            var template = new MasterBadgeTemplate { Name = "Board Star", Criteria = "x" };
            context.Users.Add(student);
            context.MasterBadgeTemplates.Add(template);
            await context.SaveChangesAsync();

            context.StudentBadges.Add(new StudentBadge
            {
                StudentId = student.Id,
                MasterBadgeTemplateId = template.Id,
                AwardedAt = DateTime.UtcNow,
                Comments = "Awesome"
            });
            await context.SaveChangesAsync();
        }

        var res = await client.GetAsync(BaseUrl);
        res.EnsureSuccessStatusCode();
        var badges = await res.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.True(badges.GetArrayLength() >= 1);
    }
}
