using A1Academy.AdminService.Controllers; using A1Academy.AuthService.Controllers; 
using A1Academy.Shared.Data;
using A1Academy.Shared.Data.Models;
using A1Academy.Shared.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace A1Academy.Tests;

public class AuthControllerTests
{
private readonly AppDbContext _context;
private readonly Mock<IConfiguration> _configurationMock;
private readonly IMemoryCache _cache;
private readonly Mock<IEmailService> _emailServiceMock;
private readonly Mock<IWebHostEnvironment> _environmentMock;
private readonly AuthController _controller;

public AuthControllerTests()
{
    // Create a unique in-memory database for every test
    var options = new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .Options;

    _context = new AppDbContext(options);

    // Mock IConfiguration
    _configurationMock = new Mock<IConfiguration>();

    _configurationMock
        .Setup(x => x["Jwt:Key"])
        .Returns("ThisIsADevelopmentJwtSecretKey123456789");

    _configurationMock
        .Setup(x => x["Jwt:Issuer"])
        .Returns("A1Academy");

    _configurationMock
        .Setup(x => x["Jwt:Audience"])
        .Returns("A1AcademyUsers");

    // Real in-memory cache
    _cache = new MemoryCache(new MemoryCacheOptions());

    // Mock email service
    _emailServiceMock = new Mock<IEmailService>();

    _emailServiceMock
        .Setup(x => x.SendEmailAsync(
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>()))
        .Returns(Task.CompletedTask);

    // Mock hosting environment (Development, so Register/Login behavior matches local runs)
    _environmentMock = new Mock<IWebHostEnvironment>();
    _environmentMock.Setup(x => x.EnvironmentName).Returns("Development");

    // Create controller
    _controller = new AuthController(
        _context,
        _configurationMock.Object,
        _cache,
        _emailServiceMock.Object,
        _environmentMock.Object);
}

[Fact]
public async Task Login_WithValidCredentials_ReturnsOk()
{
    // Arrange
    var password = "Password123!";

    var user = new User
    {
        FirstName = "Test",
        LastName = "User",
        Email = "test@example.com",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
        Role = "Student",
        AuthProvider = "Local",
        AccountStatus = AccountStatus.Active,
        IsEmailVerified = true
    };

    _context.Users.Add(user);
    await _context.SaveChangesAsync();

    var request = new AuthController.LoginRequest
    {
        Email = "test@example.com",
        Password = password
    };

    // Act
    var result = await _controller.Login(request);

    // Assert
    var okResult = Assert.IsType<OkObjectResult>(result);

    Assert.NotNull(okResult.Value);
}

[Fact]
public async Task Login_WithWrongPassword_ReturnsUnauthorized()
{
    // Arrange
    var user = new User
    {
        FirstName = "Test",
        LastName = "User",
        Email = "test@example.com",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword123!"),
        Role = "Student",
        AuthProvider = "Local",
        AccountStatus = AccountStatus.Active
    };

    _context.Users.Add(user);
    await _context.SaveChangesAsync();

    var request = new AuthController.LoginRequest
    {
        Email = "test@example.com",
        Password = "WrongPassword123!"
    };

    // Act
    var result = await _controller.Login(request);

    // Assert
    Assert.IsType<UnauthorizedObjectResult>(result);
}

[Fact]
public async Task Login_WithUnknownEmail_ReturnsUnauthorized()
{
    // Arrange
    var request = new AuthController.LoginRequest
    {
        Email = "doesnotexist@example.com",
        Password = "Password123!"
    };

    // Act
    var result = await _controller.Login(request);

    // Assert
    Assert.IsType<UnauthorizedObjectResult>(result);
}

[Fact]
public async Task Login_WithPendingTeacher_ReturnsUnauthorized()
{
    // Arrange
    var password = "Password123!";

    var user = new User
    {
        FirstName = "Teacher",
        LastName = "Test",
        Email = "teacher@example.com",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
        Role = "Teacher",
        AuthProvider = "Local",
        AccountStatus = AccountStatus.Pending
    };

    _context.Users.Add(user);
    await _context.SaveChangesAsync();

    var request = new AuthController.LoginRequest
    {
        Email = "teacher@example.com",
        Password = password
    };

    // Act
    var result = await _controller.Login(request);

    // Assert
    var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
    Assert.Equal("Your account is pending administrator approval.", unauthorized.Value);
}

[Fact]
public async Task Login_WithRejectedTeacher_ReturnsUnauthorized()
{
    // Arrange
    var password = "Password123!";

    var user = new User
    {
        FirstName = "Rejected",
        LastName = "Teacher",
        Email = "rejected-teacher@example.com",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
        Role = "Teacher",
        AuthProvider = "Local",
        AccountStatus = AccountStatus.Rejected
    };

    _context.Users.Add(user);
    await _context.SaveChangesAsync();

    var request = new AuthController.LoginRequest
    {
        Email = "rejected-teacher@example.com",
        Password = password
    };

    // Act
    var result = await _controller.Login(request);

    // Assert
    var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
    Assert.Equal("Your registration was not approved. Please contact support.", unauthorized.Value);
}

[Fact]
public async Task Login_WithDeactivatedAccount_ReturnsUnauthorized()
{
    // Arrange - deactivation applies to any role, not just teachers, so this one's a Student.
    var password = "Password123!";

    var user = new User
    {
        FirstName = "Deactivated",
        LastName = "Student",
        Email = "deactivated-student@example.com",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
        Role = "Student",
        AuthProvider = "Local",
        AccountStatus = AccountStatus.Deactivated
    };

    _context.Users.Add(user);
    await _context.SaveChangesAsync();

    var request = new AuthController.LoginRequest
    {
        Email = "deactivated-student@example.com",
        Password = password
    };

    // Act
    var result = await _controller.Login(request);

    // Assert
    var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
    Assert.Equal("Your account has been deactivated. Please contact support.", unauthorized.Value);
}

[Fact]
public async Task Register_WithNewEmail_ReturnsOk()
{
    // Arrange
    var request = new AuthController.RegisterRequest
    {
        FirstName = "New",
        LastName = "Student",
        Email = "newstudent@example.com",
        Password = "Password123!",
        Role = "Student"
    };

    // Act
    var result = await _controller.Register(request);

    // Assert
    var okResult = Assert.IsType<OkObjectResult>(result);

    Assert.NotNull(okResult.Value);

    var createdUser = await _context.Users
        .SingleOrDefaultAsync(u => u.Email == "newstudent@example.com");

    Assert.NotNull(createdUser);
    Assert.Equal("New", createdUser.FirstName);
    Assert.Equal("Student", createdUser.Role);
}

[Fact]
public async Task Register_WithTeacherRole_StartsInPendingStatus()
{
    // Arrange - a Teacher signup shouldn't be usable until an Admin approves it, which is only
    // true if it starts life as Pending rather than Active like a Student's does.
    var category = new Category { Name = "Mathematics", Description = "Algebra and calculus." };
    _context.Categories.Add(category);
    await _context.SaveChangesAsync();

    var request = new AuthController.RegisterRequest
    {
        FirstName = "New",
        LastName = "Teacher",
        Email = "newteacher@example.com",
        Password = "Password123!",
        Role = "Teacher",
        Qualifications = "BSc",
        CategoryIds = new List<int> { category.Id }
    };

    // Act
    var result = await _controller.Register(request);

    // Assert
    Assert.IsType<OkObjectResult>(result);

    var createdUser = await _context.Users
        .SingleOrDefaultAsync(u => u.Email == "newteacher@example.com");
    Assert.NotNull(createdUser);
    Assert.Equal(AccountStatus.Pending, createdUser.AccountStatus);

    // "Teacher Subject Selection" - registering as a Teacher is also the one chance to declare
    // the subject(s) taught, so a successful registration should leave exactly the requested
    // TeacherSubject row behind, tied to the newly created account.
    var registeredSubject = await _context.TeacherSubjects
        .SingleOrDefaultAsync(ts => ts.TeacherId == createdUser.Id);
    Assert.NotNull(registeredSubject);
    Assert.Equal(category.Id, registeredSubject.CategoryId);
}

[Fact]
public async Task Register_WithTeacherRoleAndNoCategories_ReturnsBadRequestAndDoesNotCreateTheAccount()
{
    var request = new AuthController.RegisterRequest
    {
        FirstName = "New",
        LastName = "Teacher",
        Email = "nosubject.teacher@example.com",
        Password = "Password123!",
        Role = "Teacher",
        Qualifications = "BSc"
        // CategoryIds deliberately left empty.
    };

    var result = await _controller.Register(request);

    Assert.IsType<BadRequestObjectResult>(result);
    var createdUser = await _context.Users
        .SingleOrDefaultAsync(u => u.Email == "nosubject.teacher@example.com");
    Assert.Null(createdUser);
}

[Fact]
public async Task Register_WithTeacherRoleAndUnknownCategoryId_ReturnsBadRequestAndDoesNotCreateTheAccount()
{
    var request = new AuthController.RegisterRequest
    {
        FirstName = "New",
        LastName = "Teacher",
        Email = "badcategory.teacher@example.com",
        Password = "Password123!",
        Role = "Teacher",
        Qualifications = "BSc",
        CategoryIds = new List<int> { 999999 }
    };

    var result = await _controller.Register(request);

    Assert.IsType<BadRequestObjectResult>(result);
    var createdUser = await _context.Users
        .SingleOrDefaultAsync(u => u.Email == "badcategory.teacher@example.com");
    Assert.Null(createdUser);
}

[Fact]
public async Task Register_WithTeacherRoleAndOnlyOtherSubject_CreatesAccountAndAPendingRequest()
{
    // Arrange - no Category matches what this Teacher teaches yet, so they type it into the
    // "Other" field instead of ticking any checkbox. Registration should still succeed, leaving
    // a pending TeacherSubjectRequest for an Admin to review rather than a BadRequest or a
    // TeacherSubject row (there's no Category to attach one to).
    var request = new AuthController.RegisterRequest
    {
        FirstName = "New",
        LastName = "Teacher",
        Email = "othersubject.teacher@example.com",
        Password = "Password123!",
        Role = "Teacher",
        Qualifications = "BSc",
        OtherSubject = "  Robotics  "
    };

    var result = await _controller.Register(request);

    Assert.IsType<OkObjectResult>(result);

    var createdUser = await _context.Users
        .SingleOrDefaultAsync(u => u.Email == "othersubject.teacher@example.com");
    Assert.NotNull(createdUser);

    Assert.False(await _context.TeacherSubjects.AnyAsync(ts => ts.TeacherId == createdUser.Id));

    var pendingRequest = await _context.TeacherSubjectRequests
        .SingleOrDefaultAsync(r => r.TeacherId == createdUser.Id);
    Assert.NotNull(pendingRequest);
    Assert.Equal("Robotics", pendingRequest.ProposedName); // trimmed
    Assert.Equal(TeacherSubjectRequestStatus.Pending, pendingRequest.Status);
    Assert.Null(pendingRequest.ResultingCategoryId);
}

[Fact]
public async Task Register_WithTeacherRoleCategoryAndOtherSubject_CreatesBothTheTeacherSubjectAndThePendingRequest()
{
    // Arrange - a Teacher can pick from the list AND type something extra in the same
    // submission; both should be recorded, on their own tracks.
    var category = new Category { Name = "Mathematics", Description = "Algebra and calculus." };
    _context.Categories.Add(category);
    await _context.SaveChangesAsync();

    var request = new AuthController.RegisterRequest
    {
        FirstName = "New",
        LastName = "Teacher",
        Email = "both.teacher@example.com",
        Password = "Password123!",
        Role = "Teacher",
        Qualifications = "BSc",
        CategoryIds = new List<int> { category.Id },
        OtherSubject = "Robotics"
    };

    var result = await _controller.Register(request);

    Assert.IsType<OkObjectResult>(result);

    var createdUser = await _context.Users
        .SingleOrDefaultAsync(u => u.Email == "both.teacher@example.com");
    Assert.NotNull(createdUser);

    Assert.True(await _context.TeacherSubjects
        .AnyAsync(ts => ts.TeacherId == createdUser.Id && ts.CategoryId == category.Id));
    Assert.True(await _context.TeacherSubjectRequests
        .AnyAsync(r => r.TeacherId == createdUser.Id && r.ProposedName == "Robotics"));
}

[Fact]
public async Task Register_WithTeacherRoleAndOtherSubjectOverTheLengthLimit_ReturnsBadRequestAndDoesNotCreateTheAccount()
{
    var request = new AuthController.RegisterRequest
    {
        FirstName = "New",
        LastName = "Teacher",
        Email = "longsubject.teacher@example.com",
        Password = "Password123!",
        Role = "Teacher",
        Qualifications = "BSc",
        OtherSubject = new string('x', 101)
    };

    var result = await _controller.Register(request);

    Assert.IsType<BadRequestObjectResult>(result);
    var createdUser = await _context.Users
        .SingleOrDefaultAsync(u => u.Email == "longsubject.teacher@example.com");
    Assert.Null(createdUser);
}

[Fact]
public async Task Register_WithAdminRole_ReturnsBadRequest()
{
    // Arrange - Admin is provisioned separately (see Program.cs bootstrap seeding); the public
    // register endpoint must never let a caller grant themselves that role.
    var request = new AuthController.RegisterRequest
    {
        FirstName = "Wannabe",
        Email = "wannabe-admin@example.com",
        Password = "Password123!",
        Role = "Admin"
    };

    // Act
    var result = await _controller.Register(request);

    // Assert
    Assert.IsType<BadRequestObjectResult>(result);

    var createdUser = await _context.Users
        .SingleOrDefaultAsync(u => u.Email == "wannabe-admin@example.com");
    Assert.Null(createdUser);
}

[Fact]
public async Task Register_WithExistingEmail_ReturnsBadRequest()
{
    // Arrange
    var existingUser = new User
    {
        FirstName = "Existing",
        Email = "existing@example.com",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
        Role = "Student",
        AccountStatus = AccountStatus.Active
    };

    _context.Users.Add(existingUser);
    await _context.SaveChangesAsync();

    var request = new AuthController.RegisterRequest
    {
        FirstName = "Another",
        Email = "existing@example.com",
        Password = "Password123!",
        Role = "Student"
    };

    // Act
    var result = await _controller.Register(request);

    // Assert
    Assert.IsType<BadRequestObjectResult>(result);
}

[Fact]
public async Task VerifyOtp_WithCorrectOtp_ReturnsOk()
{
    // Arrange
    var email = "student@example.com";
    var otp = "12345";

    _cache.Set(
        email + "_OTP",
        otp,
        TimeSpan.FromMinutes(5));

    var request = new AuthController.VerifyOtpRequest
    {
        Email = email,
        Otp = otp
    };

    // Act
    var result = await _controller.VerifyOtp(request);

    // Assert
    Assert.IsType<OkObjectResult>(result);
}

[Fact]
public async Task VerifyOtp_WithWrongOtp_ReturnsBadRequest()
{
    // Arrange
    var email = "student@example.com";

    _cache.Set(
        email + "_OTP",
        "12345",
        TimeSpan.FromMinutes(5));

    var request = new AuthController.VerifyOtpRequest
    {
        Email = email,
        Otp = "99999"
    };

    // Act
    var result = await _controller.VerifyOtp(request);

    // Assert
    Assert.IsType<BadRequestObjectResult>(result);
}

[Fact]
public void DebugOtp_InDevelopment_WithPendingOtp_ReturnsOk()
{
    // Arrange
    var email = "student@example.com";
    _cache.Set(email + "_OTP", "54321", TimeSpan.FromMinutes(5));

    // Act
    var result = _controller.DebugOtp(email);

    // Assert
    Assert.IsType<OkObjectResult>(result);
}

[Fact]
public void DebugOtp_InDevelopment_WithNoPendingOtp_ReturnsNotFound()
{
    // Act
    var result = _controller.DebugOtp("nobody@example.com");

    // Assert
    Assert.IsType<NotFoundObjectResult>(result);
}

[Fact]
public void DebugOtp_OutsideDevelopmentOrTesting_ReturnsNotFound()
{
    // Arrange
    var environmentMock = new Mock<IWebHostEnvironment>();
    environmentMock.Setup(x => x.EnvironmentName).Returns("Production");
    var controller = new AuthController(
        _context,
        _configurationMock.Object,
        _cache,
        _emailServiceMock.Object,
        environmentMock.Object);

    // Act
    var result = controller.DebugOtp("student@example.com");

    // Assert
    Assert.IsType<NotFoundResult>(result);
}

}



