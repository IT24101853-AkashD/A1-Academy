using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace A1Academy.Shared.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentBadge : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StudentBadges",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    StudentId = table.Column<int>(type: "integer", nullable: false),
                    MasterBadgeTemplateId = table.Column<int>(type: "integer", nullable: false),
                    AwardedByTeacherId = table.Column<int>(type: "integer", nullable: true),
                    AwardedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Comments = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudentBadges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudentBadges_MasterBadgeTemplates_MasterBadgeTemplateId",
                        column: x => x.MasterBadgeTemplateId,
                        principalTable: "MasterBadgeTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StudentBadges_Users_AwardedByTeacherId",
                        column: x => x.AwardedByTeacherId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_StudentBadges_Users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StudentBadges_AwardedByTeacherId",
                table: "StudentBadges",
                column: "AwardedByTeacherId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentBadges_MasterBadgeTemplateId",
                table: "StudentBadges",
                column: "MasterBadgeTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentBadges_StudentId",
                table: "StudentBadges",
                column: "StudentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StudentBadges");
        }
    }
}
