using Microsoft.EntityFrameworkCore;
using A1Academy.API.Data.Models;

namespace A1Academy.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Class> Classes { get; set; }
        public DbSet<TeacherSubject> TeacherSubjects { get; set; }
        public DbSet<TeacherSubjectRequest> TeacherSubjectRequests { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Restrict, not Cascade - deleting a category is meant to go through
            // CategoriesController's own "no active classes" guard, which returns a friendly
            // 409 instead of silently taking every attached class down with it. Restrict makes
            // that the only path: the database itself refuses a delete that would orphan a
            // class, even if some future code path forgets to check first.
            modelBuilder.Entity<Class>()
                .HasOne(c => c.Category)
                .WithMany()
                .HasForeignKey(c => c.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            // A Teacher can declare the same Category only once - the unique index makes a
            // duplicate selection impossible at the database level rather than something the
            // controller has to remember to de-duplicate on every write.
            modelBuilder.Entity<TeacherSubject>()
                .HasIndex(ts => new { ts.TeacherId, ts.CategoryId })
                .IsUnique();

            // Same reasoning as Class->Category above: Restrict so CategoriesController's delete
            // guard (which now also checks for TeacherSubjects) is the only path to removing a
            // category, not a cascading delete that silently wipes every Teacher's declared
            // subject alongside it.
            modelBuilder.Entity<TeacherSubject>()
                .HasOne(ts => ts.Category)
                .WithMany()
                .HasForeignKey(ts => ts.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            // A Teacher's own account, on the other hand, is never hard-deleted (see
            // AccountStatus - deactivation, not deletion), so this Cascade is effectively
            // unreachable in practice. It's still the semantically correct choice if that ever
            // changes: a deleted user's subject selections should disappear with them.
            modelBuilder.Entity<TeacherSubject>()
                .HasOne(ts => ts.Teacher)
                .WithMany()
                .HasForeignKey(ts => ts.TeacherId)
                .OnDelete(DeleteBehavior.Cascade);

            // "Other, please specify" subject requests - same Cascade-on-Teacher reasoning as
            // TeacherSubject above.
            modelBuilder.Entity<TeacherSubjectRequest>()
                .HasOne(r => r.Teacher)
                .WithMany()
                .HasForeignKey(r => r.TeacherId)
                .OnDelete(DeleteBehavior.Cascade);

            // Unlike TeacherSubject.CategoryId, ResultingCategoryId is just a historical pointer
            // to whichever Category an Admin approved this request against, not something that
            // needs to block a delete - SetNull keeps the request's own record intact even if
            // that Category is later removed, rather than Restrict-ing the delete on its behalf.
            modelBuilder.Entity<TeacherSubjectRequest>()
                .HasOne(r => r.ResultingCategory)
                .WithMany()
                .HasForeignKey(r => r.ResultingCategoryId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}