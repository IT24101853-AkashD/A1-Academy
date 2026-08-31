using A1Academy.API.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace A1Academy.Tests.Fixtures
{
    /// <summary>
    /// WebApplicationFactory for integration testing.
    /// Configures the API with an in-memory database for testing purposes.
    /// </summary>
    public class ApiWebApplicationFactory : WebApplicationFactory<Program>
    {
        // For now, use the default configuration
        // In-memory database can be configured via appsettings.json or environment variables
    }
}
