using System.Linq;
using A1Academy.API.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace A1Academy.Tests.Fixtures
{
    /// <summary>
    /// WebApplicationFactory for integration testing. Boots the real Program.cs pipeline
    /// (so [Authorize]/[Authorize(Roles=...)] middleware actually runs) against an in-memory
    /// database and hardcoded test-only JWT settings, so these tests never depend on a real
    /// Postgres instance or a developer's local appsettings.Development.json.
    /// </summary>
    public class ApiWebApplicationFactory : WebApplicationFactory<Program>
    {
        public const string TestJwtKey = "IntegrationTestOnlySecretKeyMustBeAtLeast32Characters!";
        public const string TestJwtIssuer = "A1AcademyTests";
        public const string TestJwtAudience = "A1AcademyTestsAudience";

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Jwt:Key"] = TestJwtKey,
                    ["Jwt:Issuer"] = TestJwtIssuer,
                    ["Jwt:Audience"] = TestJwtAudience,
                });
            });

            builder.ConfigureServices(services =>
            {
                var dbContextOptions = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (dbContextOptions != null)
                {
                    services.Remove(dbContextOptions);
                }

                // Name computed once and captured, not inlined in the lambda: AddDbContext's
                // configure delegate re-runs on every DI scope (i.e. every HTTP request each
                // gets its own scope), so a Guid.NewGuid() evaluated inside the lambda would
                // hand each request a *different* named in-memory database - one request's
                // seeded/written data would then be invisible to the next.
                var databaseName = $"ApiWebApplicationFactory_{Guid.NewGuid()}";
                services.AddDbContext<AppDbContext>(options =>
                    options.UseInMemoryDatabase(databaseName));
            });
        }
    }
}
