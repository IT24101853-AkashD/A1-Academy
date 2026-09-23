using System.Linq;
using A1Academy.Shared.Data;
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
    public class ApiWebApplicationFactory : WebApplicationFactory<A1Academy.AuthService.Program>
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
                // ASP.NET Core's default controller discovery only scans the entry point's own
                // assembly (A1Academy.AuthService here) - it does NOT pick up controllers from
                // the other service projects just because this test project references them.
                // Every "microservice" in this solution is really a separate deployable with its
                // own Program.cs, so to exercise AdminService/TeacherService/StudentService
                // controllers through this one shared factory (the way every *EndpointTests file
                // in this project assumes), their assemblies have to be added as MVC
                // ApplicationParts explicitly. Without this, every route belonging to those three
                // services 404s here even though it works fine in each service's own real host.
                services.AddControllers()
                    .AddApplicationPart(typeof(A1Academy.AdminService.Controllers.CategoriesController).Assembly)
                    .AddApplicationPart(typeof(A1Academy.TeacherService.Controllers.TeacherSubjectsController).Assembly)
                    .AddApplicationPart(typeof(A1Academy.StudentService.Controllers.ClassesController).Assembly);

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



