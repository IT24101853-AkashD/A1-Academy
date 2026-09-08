using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace A1Academy.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSecurityStamp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SecurityStamp",
                table: "Users",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            // Every row added by AddColumn's defaultValue lands on the same "" stamp, which
            // would make every account already in the database compare equal to every other on
            // this column - harmless for the per-user equality check this actually gets used
            // for, but backfilling a distinct value per row is cheap and avoids that oddity in
            // the data itself.
            migrationBuilder.Sql(
                "UPDATE \"Users\" SET \"SecurityStamp\" = md5(random()::text || clock_timestamp()::text || \"Id\"::text);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SecurityStamp",
                table: "Users");
        }
    }
}
