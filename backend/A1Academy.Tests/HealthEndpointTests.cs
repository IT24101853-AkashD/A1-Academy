using System.Linq;
using System.Net;
using A1Academy.Shared.Data;
using A1Academy.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace A1Academy.Tests;

/// <summary>
/// /health/live and /health/ready are what the deploy pipeline (and Azure probes) use to decide
/// whether a service is actually working, so the "database unreachable" case matters most: a
/// container that is running but can't reach Postgres must report 503, not 200.
/// </summary>
public class HealthEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public HealthEndpointTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Theory]
    [InlineData("/health/live")]
    [InlineData("/health/ready")]
    public async Task Health_WithWorkingDatabase_ReturnsHealthyAnonymously(string url)
    {
        var response = await _factory.CreateClient().GetAsync(url);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Ready_WhenDatabaseUnreachable_Returns503ButLiveStaysUp()
    {
        var factory = _factory.WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
            {
                var dbContextRegistrations = services
                    .Where(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>)
                        || d.ServiceType == typeof(AppDbContext)
                        || (d.ServiceType.IsGenericType && d.ServiceType.GenericTypeArguments.Contains(typeof(AppDbContext))))
                    .ToList();
                foreach (var registration in dbContextRegistrations)
                {
                    services.Remove(registration);
                }

                // Nothing listens on port 1, so every connection attempt is refused straight away.
                services.AddDbContext<AppDbContext>(options =>
                    options.UseNpgsql("Host=127.0.0.1;Port=1;Database=none;Username=none;Password=none;Timeout=3"));
            }));
        var client = factory.CreateClient();

        var ready = await client.GetAsync("/health/ready");
        var live = await client.GetAsync("/health/live");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, ready.StatusCode);
        Assert.Equal("Unhealthy", await ready.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.OK, live.StatusCode);
    }
}
