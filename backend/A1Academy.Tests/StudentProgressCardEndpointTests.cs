using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;
using A1Academy.StudentService.Controllers;
using A1Academy.Tests.Fixtures;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace A1Academy.Tests
{
    public class StudentProgressCardEndpointTests : IClassFixture<ApiWebApplicationFactory>
    {
        private readonly ApiWebApplicationFactory _factory;
        private const string Password = "TestPassword123!";

        public StudentProgressCardEndpointTests(ApiWebApplicationFactory factory)
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
        public async Task GetMyProgress_AsStudentWithClassesAttendanceAndGrades_ReturnsAccurateProgressDto()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var teacher = await SeedUserAsync(context, "Teacher", $"teacher.prog.{suffix}@example.com");
            var student = await SeedUserAsync(context, "Student", $"student.prog.{suffix}@example.com");

            var category = new Category { Name = $"Math-{suffix}", Description = "Mathematics" };
            context.Categories.Add(category);
            await context.SaveChangesAsync();

            var class1 = new Class
            {
                Name = "Calculus I",
                CategoryId = category.Id,
                TeacherId = teacher.Id,
                ScheduledAt = DateTime.UtcNow.AddDays(5),
                Capacity = 20,
                Status = ClassStatus.Active
            };
            var class2 = new Class
            {
                Name = "Linear Algebra",
                CategoryId = category.Id,
                TeacherId = teacher.Id,
                ScheduledAt = DateTime.UtcNow.AddDays(7),
                Capacity = 20,
                Status = ClassStatus.Active
            };
            var class3 = new Class
            {
                Name = "Differential Equations",
                CategoryId = category.Id,
                TeacherId = teacher.Id,
                ScheduledAt = DateTime.UtcNow.AddDays(9),
                Capacity = 20,
                Status = ClassStatus.Active
            };
            context.Classes.AddRange(class1, class2, class3);
            await context.SaveChangesAsync();

            context.Enrollments.Add(new Enrollment { ClassId = class1.Id, StudentId = student.Id });
            context.Enrollments.Add(new Enrollment { ClassId = class2.Id, StudentId = student.Id });
            context.Enrollments.Add(new Enrollment { ClassId = class3.Id, StudentId = student.Id });
            await context.SaveChangesAsync();

            // Attendance across classes:
            // Class 1: Present (100%)
            // Class 2: Present (100%)
            // Class 3: Absent (0%)
            // Overall: 2 / 3 -> 66.7%
            context.Attendances.AddRange(
                new Attendance { ClassId = class1.Id, StudentId = student.Id, Status = AttendanceStatus.Present },
                new Attendance { ClassId = class2.Id, StudentId = student.Id, Status = AttendanceStatus.Present },
                new Attendance { ClassId = class3.Id, StudentId = student.Id, Status = AttendanceStatus.Absent }
            );
            await context.SaveChangesAsync();

            // Assignments:
            // Class 1: asg1 (90)
            // Class 2: asg2 (80)
            // Class 3: asg3 (100), asg4 (null - ungraded)
            // Overall graded: (90 + 80 + 100) / 3 = 90.0%
            var asg1 = new Assignment { ClassId = class1.Id, Title = "Calc PS1", Description = "Limits", DueAt = DateTime.UtcNow.AddDays(1) };
            var asg2 = new Assignment { ClassId = class2.Id, Title = "LA PS1", Description = "Vectors", DueAt = DateTime.UtcNow.AddDays(2) };
            var asg3 = new Assignment { ClassId = class3.Id, Title = "DE PS1", Description = "ODE", DueAt = DateTime.UtcNow.AddDays(3) };
            var asg4 = new Assignment { ClassId = class3.Id, Title = "DE PS2", Description = "PDE", DueAt = DateTime.UtcNow.AddDays(4) };
            context.Assignments.AddRange(asg1, asg2, asg3, asg4);
            await context.SaveChangesAsync();

            context.AssignmentSubmissions.AddRange(
                new AssignmentSubmission { AssignmentId = asg1.Id, StudentId = student.Id, FileName = "c1.pdf", ContentType = "application/pdf", Content = new byte[] { 1 }, Grade = 90 },
                new AssignmentSubmission { AssignmentId = asg2.Id, StudentId = student.Id, FileName = "c2.pdf", ContentType = "application/pdf", Content = new byte[] { 2 }, Grade = 80 },
                new AssignmentSubmission { AssignmentId = asg3.Id, StudentId = student.Id, FileName = "l1.pdf", ContentType = "application/pdf", Content = new byte[] { 3 }, Grade = 100 },
                new AssignmentSubmission { AssignmentId = asg4.Id, StudentId = student.Id, FileName = "l2.pdf", ContentType = "application/pdf", Content = new byte[] { 4 }, Grade = null }
            );
            await context.SaveChangesAsync();

            var client = _factory.CreateClient();
            var token = await LoginAsync(client, student.Email);

            var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/classes/my-progress");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var progress = await response.Content.ReadFromJsonAsync<ClassesController.StudentProgressDto>();
            Assert.NotNull(progress);
            Assert.Equal(student.Id, progress.StudentId);
            Assert.Equal(3, progress.EnrolledClassesCount);
            Assert.Equal(3, progress.TotalAttendanceRecords);
            Assert.Equal(2, progress.PresentAttendanceRecords);
            Assert.Equal(66.7, progress.OverallAttendancePercentage);
            Assert.Equal(4, progress.TotalSubmissionsCount);
            Assert.Equal(3, progress.GradedSubmissionsCount);
            Assert.Equal(90.0, progress.OverallAverageGrade);

            // Per-class breakdown
            Assert.Equal(3, progress.ClassDetails.Count);
            var c1Progress = progress.ClassDetails.Single(c => c.ClassId == class1.Id);
            Assert.Equal(1, c1Progress.TotalAttendance);
            Assert.Equal(1, c1Progress.PresentAttendance);
            Assert.Equal(100.0, c1Progress.AttendancePercentage);
            Assert.Equal(1, c1Progress.GradedSubmissions);
            Assert.Equal(90.0, c1Progress.AverageGrade);

            var c2Progress = progress.ClassDetails.Single(c => c.ClassId == class2.Id);
            Assert.Equal(1, c2Progress.TotalAttendance);
            Assert.Equal(1, c2Progress.PresentAttendance);
            Assert.Equal(100.0, c2Progress.AttendancePercentage);
            Assert.Equal(1, c2Progress.GradedSubmissions);
            Assert.Equal(80.0, c2Progress.AverageGrade);

            var c3Progress = progress.ClassDetails.Single(c => c.ClassId == class3.Id);
            Assert.Equal(1, c3Progress.TotalAttendance);
            Assert.Equal(0, c3Progress.PresentAttendance);
            Assert.Equal(0.0, c3Progress.AttendancePercentage);
            Assert.Equal(1, c3Progress.GradedSubmissions);
            Assert.Equal(100.0, c3Progress.AverageGrade);
        }

        [Fact]
        public async Task GetMyProgress_DataIsolation_NeverReturnsAnotherStudentsFigures()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var teacher = await SeedUserAsync(context, "Teacher", $"teacher.iso.{suffix}@example.com");
            var studentA = await SeedUserAsync(context, "Student", $"studentA.iso.{suffix}@example.com");
            var studentB = await SeedUserAsync(context, "Student", $"studentB.iso.{suffix}@example.com");

            var category = new Category { Name = $"Bio-{suffix}", Description = "Biology" };
            context.Categories.Add(category);
            await context.SaveChangesAsync();

            var sharedClass = new Class
            {
                Name = "Genetics & Biotech",
                CategoryId = category.Id,
                TeacherId = teacher.Id,
                ScheduledAt = DateTime.UtcNow.AddDays(3),
                Capacity = 20,
                Status = ClassStatus.Active
            };
            context.Classes.Add(sharedClass);
            await context.SaveChangesAsync();

            context.Enrollments.Add(new Enrollment { ClassId = sharedClass.Id, StudentId = studentA.Id });
            context.Enrollments.Add(new Enrollment { ClassId = sharedClass.Id, StudentId = studentB.Id });
            await context.SaveChangesAsync();

            // Attendance: Student A has 100% (1 Present), Student B has 0% (1 Absent)
            context.Attendances.AddRange(
                new Attendance { ClassId = sharedClass.Id, StudentId = studentA.Id, Status = AttendanceStatus.Present },
                new Attendance { ClassId = sharedClass.Id, StudentId = studentB.Id, Status = AttendanceStatus.Absent }
            );
            await context.SaveChangesAsync();

            var asg = new Assignment { ClassId = sharedClass.Id, Title = "DNA Lab", Description = "Report", DueAt = DateTime.UtcNow.AddDays(2) };
            context.Assignments.Add(asg);
            await context.SaveChangesAsync();

            // Submissions: Student A = 95, Student B = 45
            context.AssignmentSubmissions.AddRange(
                new AssignmentSubmission { AssignmentId = asg.Id, StudentId = studentA.Id, FileName = "a.pdf", ContentType = "application/pdf", Content = new byte[] { 1 }, Grade = 95 },
                new AssignmentSubmission { AssignmentId = asg.Id, StudentId = studentB.Id, FileName = "b.pdf", ContentType = "application/pdf", Content = new byte[] { 2 }, Grade = 45 }
            );
            await context.SaveChangesAsync();

            var client = _factory.CreateClient();

            // Query as Student A
            var tokenA = await LoginAsync(client, studentA.Email);
            var requestA = new HttpRequestMessage(HttpMethod.Get, "/api/student/classes/my-progress");
            requestA.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenA);
            var responseA = await client.SendAsync(requestA);
            Assert.Equal(HttpStatusCode.OK, responseA.StatusCode);

            var progressA = await responseA.Content.ReadFromJsonAsync<ClassesController.StudentProgressDto>();
            Assert.NotNull(progressA);
            Assert.Equal(studentA.Id, progressA.StudentId);
            Assert.Equal(100.0, progressA.OverallAttendancePercentage);
            Assert.Equal(95.0, progressA.OverallAverageGrade);

            // Query as Student B
            var tokenB = await LoginAsync(client, studentB.Email);
            var requestB = new HttpRequestMessage(HttpMethod.Get, "/api/student/classes/my-progress");
            requestB.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenB);
            var responseB = await client.SendAsync(requestB);
            Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);

            var progressB = await responseB.Content.ReadFromJsonAsync<ClassesController.StudentProgressDto>();
            Assert.NotNull(progressB);
            Assert.Equal(studentB.Id, progressB.StudentId);
            Assert.Equal(0.0, progressB.OverallAttendancePercentage);
            Assert.Equal(45.0, progressB.OverallAverageGrade);
        }

        [Fact]
        public async Task GetMyProgress_WhenStudentHasNoEnrollmentsOrZeroAttendanceAndGrades_ReturnsZeroMetricsSafely()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var student = await SeedUserAsync(context, "Student", $"student.empty.{suffix}@example.com");

            var client = _factory.CreateClient();
            var token = await LoginAsync(client, student.Email);

            var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/classes/my-progress");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var progress = await response.Content.ReadFromJsonAsync<ClassesController.StudentProgressDto>();
            Assert.NotNull(progress);
            Assert.Equal(student.Id, progress.StudentId);
            Assert.Equal(0, progress.EnrolledClassesCount);
            Assert.Equal(0.0, progress.OverallAttendancePercentage);
            Assert.Equal(0.0, progress.OverallAverageGrade);
            Assert.Equal(0, progress.TotalAttendanceRecords);
            Assert.Equal(0, progress.TotalSubmissionsCount);
            Assert.Equal(0, progress.GradedSubmissionsCount);
            Assert.Empty(progress.ClassDetails);
        }

        [Fact]
        public async Task GetMyProgress_Unauthenticated_ReturnsUnauthorized()
        {
            var client = _factory.CreateClient();
            var response = await client.GetAsync("/api/student/classes/my-progress");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task GetMyProgress_AsTeacher_ReturnsForbidden()
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var teacher = await SeedUserAsync(context, "Teacher", $"teacher.progress.forbidden.{suffix}@example.com");

            var client = _factory.CreateClient();
            var token = await LoginAsync(client, teacher.Email);

            var request = new HttpRequestMessage(HttpMethod.Get, "/api/student/classes/my-progress");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }
}
