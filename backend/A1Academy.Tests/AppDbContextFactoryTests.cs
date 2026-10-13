using A1Academy.Shared.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace A1Academy.Tests;

/// <summary>
/// The design-time factory exists only so `dotnet ef migrations add` can build the model. It
/// must target PostgreSQL (so generated column types are right) and must not carry a credential.
/// </summary>
public class AppDbContextFactoryTests
{
    [Fact]
    public void CreateDbContext_TargetsPostgresWithoutEmbeddingAPassword()
    {
        using var context = new AppDbContextFactory().CreateDbContext(Array.Empty<string>());

        Assert.Equal("Npgsql.EntityFrameworkCore.PostgreSQL", context.Database.ProviderName);
        Assert.DoesNotContain("Password", context.Database.GetConnectionString(), StringComparison.OrdinalIgnoreCase);
    }
}
