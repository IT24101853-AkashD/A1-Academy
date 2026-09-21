using Microsoft.EntityFrameworkCore;
using A1Academy.Shared.Data.Models;

namespace A1Academy.Shared.Data
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
        public DbSet<Enrollment> Enrollments { get; set; }
        public DbSet<StudyMaterial> StudyMaterials { get; set; }
        public DbSet<Assignment> Assignments { get; set; }
        public DbSet<AssignmentSubmission> AssignmentSubmissions { get; set; }
        public DbSet<Attendance> Attendances { get; set; }

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

            // A Teacher's own account can be hard-deleted by an Admin (UsersController.DeleteUser),
            // and a deleted user's subject selections should disappear with them. This Cascade is
            // the correct semantics for a relational provider; UsersController also removes these
            // rows explicitly, since EF Core's InMemory provider (used in tests) only cascades to
            // entities already tracked by the context, not to rows it hasn't loaded.
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

            // Restrict, same guard philosophy as Class->Category: deleting a Teacher who has
            // scheduled classes should be blocked, not silently cascade away the classes (and
            // any students' enrollments/materials/assignments hanging off them).
            modelBuilder.Entity<Class>()
                .HasOne(c => c.Teacher)
                .WithMany()
                .HasForeignKey(c => c.TeacherId)
                .OnDelete(DeleteBehavior.Restrict);

            // A Student can enroll in a given Class only once - same unique-index approach as
            // TeacherSubject's (TeacherId, CategoryId).
            modelBuilder.Entity<Enrollment>()
                .HasIndex(e => new { e.StudentId, e.ClassId })
                .IsUnique();

            // Enrollment rows are owned by the Student (Cascade, same reasoning as
            // TeacherSubject->Teacher) and by the Class they belong to (Cascade - nothing
            // currently hard-deletes a Class, but if that ever changes its enrollments should go
            // with it rather than leaving orphaned rows or blocking the delete).
            modelBuilder.Entity<Enrollment>()
                .HasOne(e => e.Student)
                .WithMany()
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Enrollment>()
                .HasOne(e => e.Class)
                .WithMany()
                .HasForeignKey(e => e.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<StudyMaterial>()
                .HasOne(m => m.Class)
                .WithMany()
                .HasForeignKey(m => m.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            // Same reasoning as TeacherSubjectRequest->ResultingCategory: a material stays valid
            // and downloadable even if we lose track of exactly who uploaded it.
            modelBuilder.Entity<StudyMaterial>()
                .HasOne(m => m.UploadedByTeacher)
                .WithMany()
                .HasForeignKey(m => m.UploadedByTeacherId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Assignment>()
                .HasOne(a => a.Class)
                .WithMany()
                .HasForeignKey(a => a.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            // A Student can submit an Assignment only once - there's no resubmission path.
            modelBuilder.Entity<AssignmentSubmission>()
                .HasIndex(s => new { s.AssignmentId, s.StudentId })
                .IsUnique();

            modelBuilder.Entity<AssignmentSubmission>()
                .HasOne(s => s.Assignment)
                .WithMany()
                .HasForeignKey(s => s.AssignmentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<AssignmentSubmission>()
                .HasOne(s => s.Student)
                .WithMany()
                .HasForeignKey(s => s.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            // One attendance record per Student per Class - re-marking upserts this row instead
            // of creating a duplicate (see ClassesController's attendance endpoint).
            modelBuilder.Entity<Attendance>()
                .HasIndex(a => new { a.ClassId, a.StudentId })
                .IsUnique();

            modelBuilder.Entity<Attendance>()
                .HasOne(a => a.Class)
                .WithMany()
                .HasForeignKey(a => a.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Attendance>()
                .HasOne(a => a.Student)
                .WithMany()
                .HasForeignKey(a => a.StudentId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}


