using A1Academy.Shared.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace A1Academy.Shared.Services
{
    // Readiness check: can this service actually reach its database? A container can be
    // "Running" while every request fails (e.g. after a DB password change it hasn't picked up),
    // which is exactly what /health/ready is for - the deploy pipeline and Azure probes call it.
    public class DatabaseHealthCheck : IHealthCheck
    {
        private readonly AppDbContext _context;

        public DatabaseHealthCheck(AppDbContext context)
        {
            _context = context;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            try
            {
                return await _context.Database.CanConnectAsync(cancellationToken)
                    ? HealthCheckResult.Healthy()
                    : HealthCheckResult.Unhealthy("Cannot connect to the database.");
            }
            catch (Exception ex)
            {
                return HealthCheckResult.Unhealthy("Cannot connect to the database.", ex);
            }
        }
    }

    public static class HealthCheckExtensions
    {
        private const string ReadyTag = "ready";

        public static IServiceCollection AddA1AcademyHealthChecks(this IServiceCollection services)
        {
            services.AddHealthChecks()
                .AddCheck<DatabaseHealthCheck>("database", tags: new[] { ReadyTag });
            return services;
        }

        // /health/live  - the process is up and serving HTTP (runs no checks).
        // /health/ready - plus the database is reachable.
        // Both are anonymous and return only "Healthy"/"Unhealthy", never exception details.
        public static IEndpointRouteBuilder MapA1AcademyHealthChecks(this IEndpointRouteBuilder app)
        {
            app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false });
            app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains(ReadyTag) });
            return app;
        }
    }
}
