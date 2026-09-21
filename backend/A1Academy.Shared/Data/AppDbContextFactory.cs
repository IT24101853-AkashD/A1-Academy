using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace A1Academy.Shared.Data
{
    // A1Academy.Shared has no Program.cs/DI container of its own - every real service builds
    // AppDbContext through its own appsettings-driven connection string at runtime. `dotnet ef
    // migrations add` needs *some* way to construct the context at design time to diff the
    // model, so this factory exists purely for that - the placeholder connection string is never
    // actually connected to; `migrations add` only needs the Npgsql provider to know it's Npgsql
    // so it can generate the right column types, not a live database.
    public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
    {
        public AppDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=design_time_only;Username=design_time_only;Password=design_time_only");
            return new AppDbContext(optionsBuilder.Options);
        }
    }
}
