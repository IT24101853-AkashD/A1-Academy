using A1Academy.Shared.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using Xunit;

namespace A1Academy.Tests;

/// <summary>
/// Guards against changing the data model without adding an EF Core migration. Every other test
/// runs on the in-memory provider, which builds its schema straight from the model, so a missing
/// migration passes all of them - yet production applies only the migrations that exist
/// (Database.Migrate() at startup), so the new table/columns would never be created there and
/// every query touching them would fail. This compares the model against the latest migration
/// snapshot and fails, naming the differences, if they don't match.
/// Fix a failure with: dotnet ef migrations add &lt;Name&gt; --project backend/A1Academy.Shared --startup-project backend/A1Academy.Shared
/// </summary>
public class MigrationsTests
{
    [Fact]
    public void DataModel_HasNoChangesMissingFromMigrations()
    {
        // Npgsql provider so the relational model matches production; nothing connects to it.
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=model_check_only;Username=none;Password=none")
            .Options;
        using var context = new AppDbContext(options);

#pragma warning disable EF1001 // Internal EF Core API: the supported way to diff the model against the snapshot.
        var snapshotModel = context.GetService<IMigrationsAssembly>().ModelSnapshot?.Model;
        Assert.NotNull(snapshotModel);
        if (snapshotModel is IMutableModel mutableModel)
        {
            snapshotModel = mutableModel.FinalizeModel();
        }
        snapshotModel = context.GetService<IModelRuntimeInitializer>().Initialize(snapshotModel!);

        var differences = context.GetService<IMigrationsModelDiffer>().GetDifferences(
            snapshotModel.GetRelationalModel(),
            context.GetService<IDesignTimeModel>().Model.GetRelationalModel());
#pragma warning restore EF1001

        Assert.True(differences.Count == 0,
            "The data model has changes that no migration creates: "
            + string.Join(", ", differences.Select(d => d.GetType().Name.Replace("Operation", "") + DescribeTarget(d)))
            + ". Add a migration (see this test's summary).");
    }

    private static string DescribeTarget(MigrationOperation operation) => operation switch
    {
        CreateTableOperation t => $" {t.Name}",
        AddColumnOperation c => $" {c.Table}.{c.Name}",
        DropColumnOperation c => $" {c.Table}.{c.Name}",
        AlterColumnOperation c => $" {c.Table}.{c.Name}",
        DropTableOperation t => $" {t.Name}",
        _ => ""
    };
}
