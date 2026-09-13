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
        }
    }
}