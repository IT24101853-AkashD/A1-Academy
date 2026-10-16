using System.Net;
using System.Text.Json;
using A1Academy.Tests.Fixtures;
using Xunit;

namespace A1Academy.Tests;

/// <summary>
/// The public Swagger UI on the gateway loads each service's /swagger/v1/swagger.json, so a
/// controller that Swashbuckle can't describe (a conflicting schema name, an unannotated file
/// upload) would break the evaluators' API docs without failing anything else. This test host
/// loads the controllers of all four services, so one document here covers every endpoint.
/// </summary>
public class SwaggerEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public SwaggerEndpointTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task OpenApiDocument_IsServedAnonymously_AndDescribesEveryService()
    {
        var response = await _factory.CreateClient().GetAsync("/swagger/v1/swagger.json");

        Assert.True(response.StatusCode == HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var paths = document.RootElement.GetProperty("paths");

        Assert.True(paths.TryGetProperty("/api/auth/login", out _));
        Assert.True(paths.TryGetProperty("/api/users/{id}/approve", out _));
        Assert.True(paths.TryGetProperty("/api/teacher/classes/{classId}/assignments/{assignmentId}/submissions/{submissionId}/grade", out _));
        Assert.True(paths.TryGetProperty("/api/student/classes/my-progress", out _));
    }

    [Fact]
    public async Task OpenApiDocument_DeclaresJwtBearerAuthentication()
    {
        var json = await _factory.CreateClient().GetStringAsync("/swagger/v1/swagger.json");

        using var document = JsonDocument.Parse(json);
        var bearer = document.RootElement.GetProperty("components").GetProperty("securitySchemes").GetProperty("Bearer");
        Assert.Equal("http", bearer.GetProperty("type").GetString());
        Assert.Equal("bearer", bearer.GetProperty("scheme").GetString());
    }

    // CORS is handled by the gateway alone. If a service also answered with
    // Access-Control-Allow-Origin, the proxied response would carry the header twice and
    // browsers would reject it.
    [Fact]
    public async Task Service_SendsNoCorsHeaders_BecauseTheGatewayOwnsCors()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/health/live");
        request.Headers.Add("Origin", "http://localhost:5173");

        var response = await _factory.CreateClient().SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }
}
