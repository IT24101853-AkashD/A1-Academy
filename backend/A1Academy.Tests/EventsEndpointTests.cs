using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;
using A1Academy.Shared.Services;
using A1Academy.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace A1Academy.Tests;

/// <summary>
/// Integration tests for POST /api/events/publish through the real ASP.NET Core pipeline, so
/// [Authorize(Roles = "Admin")] actually runs (EventsControllerTests calls the controller
/// directly and bypasses it). The Kafka producer is replaced with a mock so no broker is needed.
/// </summary>
public class EventsEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly WebApplicationFactory<A1Academy.AuthService.Program> _factory;
    private readonly Mock<IKafkaProducerService> _kafkaMock = new();

    public EventsEndpointTests(ApiWebApplicationFactory factory)
    {
        _kafkaMock
            .Setup(k => k.ProduceEventAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        _factory = factory.WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
            {
                services.AddSingleton(_kafkaMock.Object);
            }));
    }

    private async Task<string> SeedAndLoginAsync(HttpClient client, string role)
    {
        var email = $"{role.ToLowerInvariant()}.events.{Guid.NewGuid():N}@example.com";
        const string password = "EventsPass1!";

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

    private static HttpRequestMessage PublishRequest(string message, string? token = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/events/publish")
        {
            Content = JsonContent.Create(message)
        };
        if (token != null)
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
        return request;
    }

    [Fact]
    public async Task Publish_WithoutToken_ReturnsUnauthorizedAndPublishesNothing()
    {
        var client = _factory.CreateClient();

        var response = await client.SendAsync(PublishRequest("anonymous"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        _kafkaMock.Verify(k => k.ProduceEventAsync(It.IsAny<string>(), "anonymous"), Times.Never);
    }

    [Fact]
    public async Task Publish_AsStudent_ReturnsForbiddenAndPublishesNothing()
    {
        var client = _factory.CreateClient();
        var token = await SeedAndLoginAsync(client, "Student");

        var response = await client.SendAsync(PublishRequest("from-student", token));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        _kafkaMock.Verify(k => k.ProduceEventAsync(It.IsAny<string>(), "from-student"), Times.Never);
    }

    [Fact]
    public async Task Publish_AsAdmin_PublishesToKafka()
    {
        var client = _factory.CreateClient();
        var token = await SeedAndLoginAsync(client, "Admin");

        var response = await client.SendAsync(PublishRequest("from-admin", token));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _kafkaMock.Verify(k => k.ProduceEventAsync("test-topic", "from-admin"), Times.Once);
    }
}
