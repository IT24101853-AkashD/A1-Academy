using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;
using A1Academy.TeacherService.Controllers;
using A1Academy.Tests.Fixtures;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace A1Academy.Tests
{
    public class TeacherGradeDistributionEndpointTests : IClassFixture<ApiWebApplicationFactory>
    {
        private readonly ApiWebApplicationFactory _factory;
        private const string Password = "TestPassword123!";

        public TeacherGradeDistributionEndpointTests(ApiWebApplicationFactory factory)
        {
            _factory = factory;
        }

        private async Task<User> SeedUserAsync(AppDbContext context, string role, string email)
        {
            var user = new User
            {
                FirstName = role,
                LastName = "User",
                Email = email,
                Role = role,
                AuthProvider = "Local",
                IsEmailVerified = true,
                AccountStatus = AccountStatus.Active,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password)
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();
            return user;
        }

        private async Task<string> LoginAsync(HttpClient client, string email)
        {
            var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password = Password });
            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
            return body.GetProperty("token").GetString()!;
        }

        [Fact]
        public async Task GetGradeDistribution_AsOwningTeacher_ReturnsAccurateAverageAndBuckets()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var teacher = await SeedUserAsync(context, "Teacher", $"teacher.dist.{suffix}@example.com");
            var student1 = await SeedUserAsync(context, "Student", $"student1.dist.{suffix}@example.com");
            var student2 = await SeedUserAsync(context, "Student", $"student2.dist.{suffix}@example.com");
            var student3 = await SeedUserAsync(context, "Student", $"student3.dist.{suffix}@example.com");

            var category = new Category { Name = $"Math-{suffix}", Description = "Mathematics" };
            context.Categories.Add(category);
            await context.SaveChangesAsync();

            var testClass = new Class
            {
                Name = "Advanced Calculus",
                CategoryId = category.Id,
                TeacherId = teacher.Id,
                ScheduledAt = DateTime.UtcNow.AddDays(5),
                Capacity = 30,
                EnrolledCount = 3,
                Status = ClassStatus.Active
            };
            context.Classes.Add(testClass);
            await context.SaveChangesAsync();

            context.Enrollments.Add(new Enrollment { ClassId = testClass.Id, StudentId = student1.Id });
            context.Enrollments.Add(new Enrollment { ClassId = testClass.Id, StudentId = student2.Id });
            context.Enrollments.Add(new Enrollment { ClassId = testClass.Id, StudentId = student3.Id });
            await context.SaveChangesAsync();

            var asg1 = new Assignment
            {
                ClassId = testClass.Id,
                Title = "Problem Set 1",
                Description = "Derivatives",
                DueAt = DateTime.UtcNow.AddDays(2)
            };
            var asg2 = new Assignment
            {
                ClassId = testClass.Id,
                Title = "Problem Set 2",
                Description = "Integrals",
                DueAt = DateTime.UtcNow.AddDays(4)
            };
            context.Assignments.AddRange(asg1, asg2);
            await context.SaveChangesAsync();

            // Submissions:
            // asg1: Student1 gets 95 (A), Student2 gets 85 (B)
            // asg2: Student3 gets 65 (D)
            context.AssignmentSubmissions.Add(new AssignmentSubmission
            {
                AssignmentId = asg1.Id,
                StudentId = student1.Id,
                FileName = "ps1_s1.pdf",
                ContentType = "application/pdf",
                Content = new byte[] { 1 },
                Grade = 95
            });
            context.AssignmentSubmissions.Add(new AssignmentSubmission
            {
                AssignmentId = asg1.Id,
                StudentId = student2.Id,
                FileName = "ps1_s2.pdf",
                ContentType = "application/pdf",
                Content = new byte[] { 2 },
                Grade = 85
            });
            context.AssignmentSubmissions.Add(new AssignmentSubmission
            {
                AssignmentId = asg2.Id,
                StudentId = student3.Id,
                FileName = "ps2_s3.pdf",
                ContentType = "application/pdf",
                Content = new byte[] { 3 },
                Grade = 65
            });
            await context.SaveChangesAsync();

            var client = _factory.CreateClient();
            var token = await LoginAsync(client, teacher.Email);

            var request = new HttpRequestMessage(HttpMethod.Get, $"/api/teacher/classes/{testClass.Id}/grade-distribution");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var report = await response.Content.ReadFromJsonAsync<ClassesController.GradeDistributionReportDto>();
            Assert.NotNull(report);
            Assert.Equal(testClass.Id, report.ClassId);
            Assert.Equal("Advanced Calculus", report.ClassName);
            Assert.Equal(2, report.TotalAssignments);
            Assert.Equal(3, report.TotalSubmissions);
            Assert.Equal(3, report.GradedSubmissionsCount);

            // Average: (95 + 85 + 65) / 3 = 245 / 3 = 81.666... -> 81.7
            Assert.Equal(81.7, report.AverageGrade);

            // Distribution verification:
            var aBucket = report.Distribution.Single(b => b.Label.StartsWith("A"));
            Assert.Equal(1, aBucket.Count);
            Assert.Equal(33.3, aBucket.Percentage);

            var bBucket = report.Distribution.Single(b => b.Label.StartsWith("B"));
            Assert.Equal(1, bBucket.Count);
            Assert.Equal(33.3, bBucket.Percentage);

            var cBucket = report.Distribution.Single(b => b.Label.StartsWith("C"));
            Assert.Equal(0, cBucket.Count);
            Assert.Equal(0.0, cBucket.Percentage);

            var dBucket = report.Distribution.Single(b => b.Label.StartsWith("D"));
            Assert.Equal(1, dBucket.Count);
            Assert.Equal(33.3, dBucket.Percentage);

            var fBucket = report.Distribution.Single(b => b.Label.StartsWith("F"));
            Assert.Equal(0, fBucket.Count);
            Assert.Equal(0.0, fBucket.Percentage);

            // Assignment breakdown:
            Assert.Equal(2, report.Assignments.Count);
            var asg1Stat = report.Assignments.Single(a => a.AssignmentId == asg1.Id);
            Assert.Equal(2, asg1Stat.GradedCount);
            Assert.Equal(90.0, asg1Stat.AverageGrade);
            Assert.Equal(85, asg1Stat.MinGrade);
            Assert.Equal(95, asg1Stat.MaxGrade);
        }

        [Fact]
        public async Task GetGradeDistribution_WhenNoSubmissionsOrGrades_ReturnsZeroCleanly()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var teacher = await SeedUserAsync(context, "Teacher", $"teacher.empty.{suffix}@example.com");
            var category = new Category { Name = $"Physics-{suffix}", Description = "Physics" };
            context.Categories.Add(category);
            await context.SaveChangesAsync();

            var testClass = new Class
            {
                Name = "Quantum Optics",
                CategoryId = category.Id,
                TeacherId = teacher.Id,
                ScheduledAt = DateTime.UtcNow.AddDays(7),
                Capacity = 15,
                Status = ClassStatus.Active
            };
            context.Classes.Add(testClass);
            await context.SaveChangesAsync();

            var client = _factory.CreateClient();
            var token = await LoginAsync(client, teacher.Email);

            var request = new HttpRequestMessage(HttpMethod.Get, $"/api/teacher/classes/{testClass.Id}/grade-distribution");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var report = await response.Content.ReadFromJsonAsync<ClassesController.GradeDistributionReportDto>();
            Assert.NotNull(report);
            Assert.Equal(0.0, report.AverageGrade);
            Assert.Equal(0, report.GradedSubmissionsCount);
            Assert.Equal(0, report.TotalSubmissions);
            Assert.Equal(0, report.TotalAssignments);
            Assert.All(report.Distribution, b => Assert.Equal(0, b.Count));
            Assert.Empty(report.Assignments);
        }

        [Fact]
        public async Task GetGradeDistribution_ForAnotherTeachersClass_ReturnsNotFound()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var teacherOwner = await SeedUserAsync(context, "Teacher", $"owner.{suffix}@example.com");
            var teacherOther = await SeedUserAsync(context, "Teacher", $"other.{suffix}@example.com");

            var category = new Category { Name = $"Bio-{suffix}", Description = "Biology" };
            context.Categories.Add(category);
            await context.SaveChangesAsync();

            var testClass = new Class
            {
                Name = "Genetics",
                CategoryId = category.Id,
                TeacherId = teacherOwner.Id,
                ScheduledAt = DateTime.UtcNow.AddDays(3),
                Capacity = 20,
                Status = ClassStatus.Active
            };
            context.Classes.Add(testClass);
            await context.SaveChangesAsync();

            var client = _factory.CreateClient();
            var tokenOther = await LoginAsync(client, teacherOther.Email);

            var request = new HttpRequestMessage(HttpMethod.Get, $"/api/teacher/classes/{testClass.Id}/grade-distribution");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenOther);

            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task GetGradeDistribution_CancelledClass_ReturnsBadRequest()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var teacher = await SeedUserAsync(context, "Teacher", $"teacher.cancelled.{suffix}@example.com");
            var category = new Category { Name = $"History-{suffix}", Description = "History" };
            context.Categories.Add(category);
            await context.SaveChangesAsync();

            var testClass = new Class
            {
                Name = "Ancient Civilizations",
                CategoryId = category.Id,
                TeacherId = teacher.Id,
                ScheduledAt = DateTime.UtcNow.AddDays(2),
                Capacity = 20,
                Status = ClassStatus.Cancelled
            };
            context.Classes.Add(testClass);
            await context.SaveChangesAsync();

            var client = _factory.CreateClient();
            var token = await LoginAsync(client, teacher.Email);

            var request = new HttpRequestMessage(HttpMethod.Get, $"/api/teacher/classes/{testClass.Id}/grade-distribution");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task GetGradeDistribution_Unauthenticated_ReturnsUnauthorized()
        {
            var client = _factory.CreateClient();
            var response = await client.GetAsync("/api/teacher/classes/999/grade-distribution");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task GetGradeDistribution_AsStudent_ReturnsForbidden()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var student = await SeedUserAsync(context, "Student", $"student.forbidden.{suffix}@example.com");

            var client = _factory.CreateClient();
            var token = await LoginAsync(client, student.Email);

            var request = new HttpRequestMessage(HttpMethod.Get, "/api/teacher/classes/1/grade-distribution");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }
}
