using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;
using A1Academy.Tests.Fixtures;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace A1Academy.Tests
{
    public class ReportExportEndpointTests : IClassFixture<ApiWebApplicationFactory>
    {
        private readonly ApiWebApplicationFactory _factory;
        private const string Password = "TestPassword123!";

        public ReportExportEndpointTests(ApiWebApplicationFactory factory)
        {
            _factory = factory;
        }

        private async Task<User> SeedUserAsync(AppDbContext context, string role, string email, string status = AccountStatus.Active)
        {
            var user = new User
            {
                FirstName = role,
                LastName = "User",
                Email = email,
                Role = role,
                AuthProvider = "Local",
                IsEmailVerified = true,
                AccountStatus = status,
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
        public async Task ExportUsers_AsAdmin_ReturnsAccurateFilteredCsv()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var admin = await SeedUserAsync(context, "Admin", $"admin.exp.{suffix}@example.com");
            var pendingTeacher = await SeedUserAsync(context, "Teacher", $"t.pending.{suffix}@example.com", AccountStatus.Pending);
            var activeTeacher = await SeedUserAsync(context, "Teacher", $"t.active.{suffix}@example.com", AccountStatus.Active);
            var student = await SeedUserAsync(context, "Student", $"s.active.{suffix}@example.com", AccountStatus.Active);

            var client = _factory.CreateClient();
            var token = await LoginAsync(client, admin.Email);

            var request = new HttpRequestMessage(HttpMethod.Get, "/api/users/export?role=Teacher&status=Pending");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);

            var csvContent = await response.Content.ReadAsStringAsync();
            Assert.Contains("User ID,Name,Email,Role,Account Status", csvContent);
            Assert.Contains(pendingTeacher.Email, csvContent);
            Assert.DoesNotContain(activeTeacher.Email, csvContent);
            Assert.DoesNotContain(student.Email, csvContent);
        }

        [Fact]
        public async Task ExportUsers_AuthorizationGuards_WorkCorrectly()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var student = await SeedUserAsync(context, "Student", $"student.exp.guard.{suffix}@example.com");

            var client = _factory.CreateClient();

            // 1. Unauthenticated -> 401
            var unauthRes = await client.GetAsync("/api/users/export");
            Assert.Equal(HttpStatusCode.Unauthorized, unauthRes.StatusCode);

            // 2. Student caller -> 403 Forbidden
            var token = await LoginAsync(client, student.Email);
            var forbiddenReq = new HttpRequestMessage(HttpMethod.Get, "/api/users/export");
            forbiddenReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var forbiddenRes = await client.SendAsync(forbiddenReq);
            Assert.Equal(HttpStatusCode.Forbidden, forbiddenRes.StatusCode);
        }

        [Fact]
        public async Task ExportRoster_AsTeacher_ReturnsAccurateRosterCsvAndEnforcesOwnership()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var teacherOwner = await SeedUserAsync(context, "Teacher", $"teacher.owner.{suffix}@example.com");
            var teacherOther = await SeedUserAsync(context, "Teacher", $"teacher.other.{suffix}@example.com");
            var student1 = await SeedUserAsync(context, "Student", $"student1.r.{suffix}@example.com");
            var student2 = await SeedUserAsync(context, "Student", $"student2.r.{suffix}@example.com");

            var category = new Category { Name = $"Cat-{suffix}", Description = "Test" };
            context.Categories.Add(category);
            await context.SaveChangesAsync();

            var testClass = new Class
            {
                Name = "Export Roster Class",
                CategoryId = category.Id,
                TeacherId = teacherOwner.Id,
                ScheduledAt = DateTime.UtcNow.AddDays(3),
                Capacity = 20,
                Status = ClassStatus.Active
            };
            context.Classes.Add(testClass);
            await context.SaveChangesAsync();

            context.Enrollments.Add(new Enrollment { ClassId = testClass.Id, StudentId = student1.Id });
            context.Enrollments.Add(new Enrollment { ClassId = testClass.Id, StudentId = student2.Id });
            context.Attendances.Add(new Attendance { ClassId = testClass.Id, StudentId = student1.Id, Status = AttendanceStatus.Present });
            context.Attendances.Add(new Attendance { ClassId = testClass.Id, StudentId = student2.Id, Status = AttendanceStatus.Absent });
            await context.SaveChangesAsync();

            var client = _factory.CreateClient();

            // Owning teacher exports roster
            var tokenOwner = await LoginAsync(client, teacherOwner.Email);
            var reqOwner = new HttpRequestMessage(HttpMethod.Get, $"/api/teacher/classes/{testClass.Id}/roster/export");
            reqOwner.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenOwner);

            var resOwner = await client.SendAsync(reqOwner);
            Assert.Equal(HttpStatusCode.OK, resOwner.StatusCode);
            Assert.Equal("text/csv", resOwner.Content.Headers.ContentType?.MediaType);

            var csvContent = await resOwner.Content.ReadAsStringAsync();
            Assert.Contains("Student ID,First Name,Last Name,Email,Attendance Status", csvContent);
            Assert.Contains(student1.Email, csvContent);
            Assert.Contains("Present", csvContent);
            Assert.Contains(student2.Email, csvContent);
            Assert.Contains("Absent", csvContent);

            // Other teacher cannot export someone else's class -> 404
            var tokenOther = await LoginAsync(client, teacherOther.Email);
            var reqOther = new HttpRequestMessage(HttpMethod.Get, $"/api/teacher/classes/{testClass.Id}/roster/export");
            reqOther.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenOther);

            var resOther = await client.SendAsync(reqOther);
            Assert.Equal(HttpStatusCode.NotFound, resOther.StatusCode);
        }

        [Fact]
        public async Task ExportSubmissions_AsTeacher_ReturnsAccurateSubmissionsCsv()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var teacher = await SeedUserAsync(context, "Teacher", $"teacher.asg.{suffix}@example.com");
            var student = await SeedUserAsync(context, "Student", $"student.asg.{suffix}@example.com");

            var category = new Category { Name = $"Subject-{suffix}", Description = "Test" };
            context.Categories.Add(category);
            await context.SaveChangesAsync();

            var testClass = new Class
            {
                Name = "Robotics Lab",
                CategoryId = category.Id,
                TeacherId = teacher.Id,
                ScheduledAt = DateTime.UtcNow.AddDays(4),
                Capacity = 15,
                Status = ClassStatus.Active
            };
            context.Classes.Add(testClass);
            await context.SaveChangesAsync();

            context.Enrollments.Add(new Enrollment { ClassId = testClass.Id, StudentId = student.Id });
            await context.SaveChangesAsync();

            var asg = new Assignment
            {
                ClassId = testClass.Id,
                Title = "PID Controller Design",
                Description = "Implement tuning",
                DueAt = DateTime.UtcNow.AddDays(2)
            };
            context.Assignments.Add(asg);
            await context.SaveChangesAsync();

            context.AssignmentSubmissions.Add(new AssignmentSubmission
            {
                AssignmentId = asg.Id,
                StudentId = student.Id,
                FileName = "pid_report.pdf",
                ContentType = "application/pdf",
                Content = new byte[] { 1, 2, 3 },
                Status = "On Time",
                Grade = 96,
                Feedback = "Excellent PID calculations."
            });
            await context.SaveChangesAsync();

            var client = _factory.CreateClient();
            var token = await LoginAsync(client, teacher.Email);

            // 1. Export class-wide submissions
            var reqClass = new HttpRequestMessage(HttpMethod.Get, $"/api/teacher/classes/{testClass.Id}/submissions/export");
            reqClass.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var resClass = await client.SendAsync(reqClass);
            Assert.Equal(HttpStatusCode.OK, resClass.StatusCode);

            var csvClass = await resClass.Content.ReadAsStringAsync();
            Assert.Contains("Submission ID,Assignment,Student ID,Student Name,Student Email,File Name,Submitted At (UTC),Status,Grade,Feedback", csvClass);
            Assert.Contains("PID Controller Design", csvClass);
            Assert.Contains(student.Email, csvClass);
            Assert.Contains("96", csvClass);
            Assert.Contains("Excellent PID calculations.", csvClass);

            // 2. Export specific assignment submissions
            var reqAsg = new HttpRequestMessage(HttpMethod.Get, $"/api/teacher/classes/{testClass.Id}/assignments/{asg.Id}/submissions/export");
            reqAsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var resAsg = await client.SendAsync(reqAsg);
            Assert.Equal(HttpStatusCode.OK, resAsg.StatusCode);

            var csvAsg = await resAsg.Content.ReadAsStringAsync();
            Assert.Contains("pid_report.pdf", csvAsg);
            Assert.Contains(student.Email, csvAsg);
        }

        [Fact]
        public async Task ExportMyClasses_AsStudent_ReturnsOnlyEnrolledClassesWithAccurateFigures()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var teacher = await SeedUserAsync(context, "Teacher", $"teacher.std.{suffix}@example.com");
            var student = await SeedUserAsync(context, "Student", $"student.myclasses.{suffix}@example.com");

            var category = new Category { Name = $"AI-{suffix}", Description = "Artificial Intelligence" };
            context.Categories.Add(category);
            await context.SaveChangesAsync();

            var enrolledClass = new Class
            {
                Name = "Deep Learning Systems",
                CategoryId = category.Id,
                TeacherId = teacher.Id,
                ScheduledAt = DateTime.UtcNow.AddDays(5),
                Capacity = 20,
                Status = ClassStatus.Active
            };
            var notEnrolledClass = new Class
            {
                Name = "Quantum Cryptography",
                CategoryId = category.Id,
                TeacherId = teacher.Id,
                ScheduledAt = DateTime.UtcNow.AddDays(6),
                Capacity = 20,
                Status = ClassStatus.Active
            };
            context.Classes.AddRange(enrolledClass, notEnrolledClass);
            await context.SaveChangesAsync();

            context.Enrollments.Add(new Enrollment { ClassId = enrolledClass.Id, StudentId = student.Id });
            context.Attendances.Add(new Attendance { ClassId = enrolledClass.Id, StudentId = student.Id, Status = AttendanceStatus.Present });

            var asg = new Assignment { ClassId = enrolledClass.Id, Title = "CNN Implementation", DueAt = DateTime.UtcNow.AddDays(1), Description = "CNN" };
            context.Assignments.Add(asg);
            await context.SaveChangesAsync();

            context.AssignmentSubmissions.Add(new AssignmentSubmission
            {
                AssignmentId = asg.Id,
                StudentId = student.Id,
                FileName = "cnn.py",
                ContentType = "text/plain",
                Content = new byte[] { 4, 5 },
                Grade = 92
            });
            await context.SaveChangesAsync();

            var client = _factory.CreateClient();
            var token = await LoginAsync(client, student.Email);

            var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/classes/export");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);

            var csvContent = await response.Content.ReadAsStringAsync();
            Assert.Contains("Class ID,Class Name,Subject,Teacher,Scheduled At (UTC),Class Status,Attendance Status,Graded Submissions,Average Grade", csvContent);
            Assert.Contains("Deep Learning Systems", csvContent);
            Assert.Contains("Present", csvContent);
            Assert.Contains("92%", csvContent);
            Assert.DoesNotContain("Quantum Cryptography", csvContent); // Enforces data isolation
        }
    }
}
