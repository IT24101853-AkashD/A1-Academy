using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace A1Academy.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The scaffolded version of this migration dropped IsApproved before adding
            // AccountStatus, which would've thrown away exactly the information needed to set
            // the new column correctly on existing rows. Add the new column first, backfill it
            // from the old one while it's still there, then drop IsApproved.
            migrationBuilder.AddColumn<string>(
                name: "AccountStatus",
                table: "Users",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Active");

            migrationBuilder.Sql(
                "UPDATE \"Users\" SET \"AccountStatus\" = CASE " +
                "WHEN \"Role\" = 'Teacher' AND \"IsApproved\" = FALSE THEN 'Pending' " +
                "ELSE 'Active' END;");

            migrationBuilder.DropColumn(
                name: "IsApproved",
                table: "Users");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsApproved",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            // Only "Pending" maps back to not-approved - Rejected/Deactivated didn't exist under
            // the old bool model, so the closest honest mapping is "not approved" for Pending
            // and "approved" for everything else.
            migrationBuilder.Sql(
                "UPDATE \"Users\" SET \"IsApproved\" = (\"AccountStatus\" <> 'Pending');");

            migrationBuilder.DropColumn(
                name: "AccountStatus",
                table: "Users");
        }
    }
}
