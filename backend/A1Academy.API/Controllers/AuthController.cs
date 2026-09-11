using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using A1Academy.API.Data;
using A1Academy.API.Data.Models;
using A1Academy.API.Services;
using Microsoft.Extensions.Caching.Memory;
using BCrypt.Net;
using Google.Apis.Auth;
using AccountStatus = A1Academy.API.Data.Models.AccountStatus;

namespace A1Academy.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IMemoryCache _cache;
        private readonly IEmailService _emailService;
        private readonly IWebHostEnvironment _environment;

        public AuthController(AppDbContext context, IConfiguration configuration, IMemoryCache cache, IEmailService emailService, IWebHostEnvironment environment)
        {
            _context = context;
            _configuration = configuration;
            _cache = cache;
            _emailService = emailService;
            _environment = environment;
        }

        public class RegisterRequest
        {
            public string FirstName { get; set; } = string.Empty;
            public string? LastName { get; set; }
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
            public string Role { get; set; } = "Student";
            public string? Qualifications { get; set; }
            public IFormFile? QualificationDocument { get; set; }
        }

        private static readonly string[] SelfRegisterableRoles = { "Student", "Teacher" };

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromForm] RegisterRequest request)
        {
            // Admin accounts are provisioned separately (see Program.cs bootstrap seeding) and
            // are never selectable through this public endpoint - otherwise anyone could POST
            // role=Admin here and grant themselves access to admin-only endpoints.
            if (!SelfRegisterableRoles.Contains(request.Role))
            {
                return BadRequest("Invalid role. Registration is only available for Student or Teacher accounts.");
            }

            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                return BadRequest("Email already exists.");
            }

            string? documentPath = null;
            if (request.Role == "Teacher" && request.QualificationDocument != null)
            {
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);
                
                var uniqueFileName = Guid.NewGuid().ToString() + "_" + request.QualificationDocument.FileName;
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);
                
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await request.QualificationDocument.CopyToAsync(stream);
                }
                documentPath = "/uploads/" + uniqueFileName;
            }

            var user = new User
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                Role = request.Role,
                Qualifications = request.Role == "Teacher" ? request.Qualifications : null,
                QualificationDocumentPath = documentPath,
                IsEmailVerified = _cache.TryGetValue(request.Email + "_VERIFIED", out bool isVerified) && isVerified,
                // Teachers start Pending and need an Admin's approval before they can log in;
                // everyone else self-registerable (Students) goes straight to Active.
                AccountStatus = request.Role == "Teacher" ? AccountStatus.Pending : AccountStatus.Active,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // "isApproved" is kept as the response key (rather than renamed to match the new
            // AccountStatus field) since the frontend's signup flow already branches on it.
            return Ok(new { message = "User registered successfully.", isApproved = user.AccountStatus == AccountStatus.Active });
        }

        public class LoginRequest
        {
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequest request)
        {
            var user = await _context.Users.SingleOrDefaultAsync(u => u.Email == request.Email);
            
            if (user == null)
            {
                return Unauthorized("Invalid email or password.");
            }

            if (user.AuthProvider == "Google")
            {
                return Unauthorized("This email is registered via Google. Please use 'Sign in with Google'.");
            }

            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Unauthorized("Invalid email or password.");
            }

            if (user.AccountStatus != AccountStatus.Active)
            {
                return Unauthorized(LoginBlockedMessage(user.AccountStatus));
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role),
                    new Claim(A1Academy.API.Data.Models.User.SecurityStampClaimType, user.SecurityStamp)
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                Issuer = _configuration["Jwt:Issuer"],
                Audience = _configuration["Jwt:Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var jwt = tokenHandler.WriteToken(token);

            return Ok(new { token = jwt, role = user.Role });
        }

        // One message per non-Active status so the login screen can tell a Teacher still
        // waiting on review apart from someone whose account got turned off.
        private static string LoginBlockedMessage(string accountStatus) => accountStatus switch
        {
            AccountStatus.Pending => "Your account is pending administrator approval.",
            AccountStatus.Rejected => "Your registration was not approved. Please contact support.",
            AccountStatus.Deactivated => "Your account has been deactivated. Please contact support.",
            _ => "Your account cannot log in at this time. Please contact support."
        };

        public class GoogleLoginRequest
        {
            public string Credential { get; set; } = string.Empty;
        }

        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        {
            try
            {
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", request.Credential);
                var response = await httpClient.GetAsync("https://www.googleapis.com/oauth2/v3/userinfo");
                if (!response.IsSuccessStatusCode) return Unauthorized("Invalid Google token.");
                
                var userInfoString = await response.Content.ReadAsStringAsync();
                var payload = System.Text.Json.JsonDocument.Parse(userInfoString).RootElement;
                var email = payload.GetProperty("email").GetString();
                var givenName = payload.TryGetProperty("given_name", out var gn) ? gn.GetString() : "Student";
                var familyName = payload.TryGetProperty("family_name", out var fn) ? fn.GetString() : "";

                var user = await _context.Users.SingleOrDefaultAsync(u => u.Email == email);

                if (user == null)
                {
                    user = new User
                    {
                        FirstName = givenName ?? "Student",
                        LastName = familyName,
                        Email = email,
                        PasswordHash = "",
                        Role = "Student",
                        AuthProvider = "Google",
                        AccountStatus = AccountStatus.Active
                    };
                    _context.Users.Add(user);
                    await _context.SaveChangesAsync();
                }
                else
                {
                    if (user.Role == "Teacher")
                    {
                        return Unauthorized("Google Sign-In is only available for Students. Please use your email and password.");
                    }
                    if (user.AuthProvider != "Google")
                    {
                        return Unauthorized("This email is registered with a password. Please log in normally.");
                    }
                }

                if (user.AccountStatus != AccountStatus.Active)
                {
                    return Unauthorized(LoginBlockedMessage(user.AccountStatus));
                }

                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!);
                var tokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                        new Claim(ClaimTypes.Email, user.Email),
                        new Claim(ClaimTypes.Role, user.Role),
                        new Claim(A1Academy.API.Data.Models.User.SecurityStampClaimType, user.SecurityStamp)
                    }),
                    Expires = DateTime.UtcNow.AddDays(7),
                    Issuer = _configuration["Jwt:Issuer"],
                    Audience = _configuration["Jwt:Audience"],
                    SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
                };
                
                var token = tokenHandler.CreateToken(tokenDescriptor);
                var jwt = tokenHandler.WriteToken(token);

                return Ok(new { token = jwt, role = user.Role });
            }
            catch (InvalidJwtException)
            {
                return Unauthorized("Invalid Google credential.");
            }
        }

        public class ProfileResponse
        {
            public string Name { get; set; } = string.Empty;
            public string FirstName { get; set; } = string.Empty;
            public string? LastName { get; set; }
            public string Email { get; set; } = string.Empty;
            public string Role { get; set; } = string.Empty;
            public string? PhoneNumber { get; set; }
        }

        // "View Profile Information" - any logged-in user (Student, Teacher, or Admin) can look
        // up their own registered details, sourced fresh from the database rather than trusting
        // whatever the JWT's claims happened to say at login time. [Authorize] here is deliberate
        // and unqualified (no Roles=), unlike UsersController - this is every authenticated
        // user's own record, not an admin-only directory. Kept in AuthController rather than
        // UsersController for exactly that reason - UsersController's class-level
        // [Authorize(Roles = "Admin")] would still apply even to an action there that added its
        // own unrestricted [Authorize], since ASP.NET Core requires every authorization attribute
        // on both the class and the action to pass, not just the most specific one.
        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized();
            }

            // Projected straight into ProfileResponse, same reasoning as UsersController's
            // directory query - the password hash and everything else on User never leaves this
            // method even by accident.
            var profile = await _context.Users.AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => new ProfileResponse
                {
                    Name = (u.FirstName + " " + (u.LastName ?? string.Empty)).Trim(),
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Email = u.Email,
                    Role = u.Role,
                    PhoneNumber = u.PhoneNumber
                })
                .SingleOrDefaultAsync();

            // The token passed OnTokenValidated's live account-status check to get this far, so
            // this is only reachable if the account was deleted outright in the instant between
            // that check and this query - not a case worth a friendlier message than plain 404.
            if (profile == null)
            {
                return NotFound();
            }

            return Ok(profile);
        }

        public class UpdateProfileRequest
        {
            public int? UserId { get; set; }
            public string FirstName { get; set; } = string.Empty;
            public string? LastName { get; set; }
            public string? PhoneNumber { get; set; }
        }

        // Lenient on purpose - digits, spaces, and the punctuation real phone numbers actually
        // use (+, -, parentheses) - this is a display field, not something dialed programmatically,
        // so it's a sanity check against garbage input rather than a strict international format.
        private static readonly System.Text.RegularExpressions.Regex PhoneNumberPattern =
            new(@"^[0-9+()\-\s]{7,20}$");

        // Mirrors User.FirstName/LastName's [StringLength(50)]. Without this check, a name longer
        // than the column allows would sail past every check here and only fail once
        // SaveChangesAsync hits Postgres - an unhandled "value too long for type character
        // varying(50)" error surfacing as a raw 500, instead of the clean 400 an oversized-but-
        // otherwise-ordinary input deserves.
        private const int MaxNameLength = 50;

        // "Edit Profile & Cross-User Protection". Scenario 1 (successful update) is the body of
        // this method; Scenario 2 (cross-user modification is rejected) is handled by what this
        // method deliberately does NOT do - there is no user id anywhere in this endpoint's route
        // or request body, so there is no field a caller could set to point the update at anyone
        // else's account. The target is always resolved from the caller's own JWT, the same way
        // GET /me does it, which makes cross-user modification structurally impossible rather
        // than something checked for and rejected after the fact.
        [Authorize]
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized();
            }

            if (request.UserId.HasValue && request.UserId.Value != userId)
            {
                return Forbid();
            }

            // Only Name and Contact Info are editable here, per the ticket - Email is the login
            // identifier and changing it deserves its own re-verification flow, and Role/
            // AccountStatus stay exclusively Admin-controlled (UsersController). Neither of those
            // even appears on UpdateProfileRequest, so there's nothing to strip out here - a
            // caller physically cannot smuggle a role change through this endpoint.
            if (string.IsNullOrWhiteSpace(request.FirstName))
            {
                return BadRequest("First name is required.");
            }

            if (request.FirstName.Trim().Length > MaxNameLength)
            {
                return BadRequest($"First name must be {MaxNameLength} characters or fewer.");
            }

            if (!string.IsNullOrWhiteSpace(request.LastName) && request.LastName.Trim().Length > MaxNameLength)
            {
                return BadRequest($"Last name must be {MaxNameLength} characters or fewer.");
            }

            if (!string.IsNullOrWhiteSpace(request.PhoneNumber) && !PhoneNumberPattern.IsMatch(request.PhoneNumber))
            {
                return BadRequest("Enter a valid phone number.");
            }

            var user = await _context.Users.SingleOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                return NotFound();
            }

            user.FirstName = request.FirstName.Trim();
            user.LastName = string.IsNullOrWhiteSpace(request.LastName) ? null : request.LastName.Trim();
            user.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();

            // Deliberately NOT rotating SecurityStamp here, unlike every transition in
            // UsersController. Those rotate it because they're admin actions taken against
            // someone else's account, meant to kill whatever session that account already has
            // open. This is a user editing their own name/phone - rotating the stamp would
            // invalidate the very session that just made this request, logging them out the
            // instant they saved their own profile.
            await _context.SaveChangesAsync();

            return Ok(new ProfileResponse
            {
                Name = (user.FirstName + " " + (user.LastName ?? string.Empty)).Trim(),
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                Role = user.Role,
                PhoneNumber = user.PhoneNumber
            });
        }

        public class OtpRequest { public string Email { get; set; } = string.Empty; public string FirstName { get; set; } = string.Empty; }
        public class VerifyOtpRequest { public string Email { get; set; } = string.Empty; public string Otp { get; set; } = string.Empty; }

        [HttpPost("send-otp")]
        public async Task<IActionResult> SendOtp([FromBody] OtpRequest request)
        {
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                return BadRequest("This email is already taken.");
            }
            var otp = new Random().Next(10000, 99999).ToString();
            Console.WriteLine($"SendOtp Called! Generated OTP '{otp}' for {request.FirstName} ({request.Email})");
            _cache.Set(request.Email + "_OTP", otp, TimeSpan.FromMinutes(5));

            var emailBody = GetEmailTemplate(request.FirstName, otp, "Thank you for registering. Your A1 Academy verification code is:");
            await _emailService.SendEmailAsync(request.Email, "A1 Academy - Verification Code", emailBody);
            return Ok(new { message = "OTP sent successfully." });
        }

        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            _cache.TryGetValue(request.Email + "_OTP", out string? cachedOtp);
            Console.WriteLine($"VerifyOtp Called! Email: '{request.Email}', Input OTP: '{request.Otp}', Cached OTP: '{cachedOtp}'");
            if (cachedOtp != null && cachedOtp == request.Otp)
            {
                var user = await _context.Users.SingleOrDefaultAsync(u => u.Email == request.Email);
                if (user != null)
                {
                    user.IsEmailVerified = true;
                    await _context.SaveChangesAsync();
                }
                else
                {
                    _cache.Set(request.Email + "_VERIFIED", true, TimeSpan.FromMinutes(30));
                }
                _cache.Remove(request.Email + "_OTP");
                return Ok(new { message = "Email successfully verified." });
            }
            return BadRequest("Invalid or expired OTP.");
        }

        /// <summary>
        /// Test-support endpoint that exposes the pending signup OTP for a given email.
        /// Never available outside Development/Testing environments - real SMTP delivery
        /// is the only OTP channel in Production. Lets automated E2E tests (e.g. Selenium)
        /// complete the email-verification step without needing a real mailbox.
        /// </summary>
        [HttpGet("debug-otp")]
        public IActionResult DebugOtp([FromQuery] string email)
        {
            if (!_environment.IsDevelopment() && _environment.EnvironmentName != "Testing")
            {
                return NotFound();
            }

            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest("email query parameter is required.");
            }

            if (_cache.TryGetValue(email + "_OTP", out string? otp))
            {
                return Ok(new { otp });
            }

            return NotFound("No pending OTP for this email.");
        }

        public class ForgotPasswordRequest { public string FirstName { get; set; } = string.Empty; public string Email { get; set; } = string.Empty; }
        public class VerifyResetOtpRequest { public string Email { get; set; } = string.Empty; public string Otp { get; set; } = string.Empty; }
        public class ResetPasswordRequest { public string Email { get; set; } = string.Empty; public string Token { get; set; } = string.Empty; public string NewPassword { get; set; } = string.Empty; }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var user = await _context.Users.SingleOrDefaultAsync(u => u.Email == request.Email && u.FirstName == request.FirstName);
            if (user == null) return BadRequest("We couldn't find an account matching that Name and Email.");

            var otp = new Random().Next(10000, 99999).ToString();
            _cache.Set(request.Email + "_RESET_OTP", otp, TimeSpan.FromMinutes(5));
            var emailBody = GetEmailTemplate(request.FirstName, otp, "We received a request to reset your password. Your A1 Academy password reset code is:");
            await _emailService.SendEmailAsync(request.Email, "A1 Academy - Password Reset Code", emailBody);
            return Ok(new { message = "Reset code sent successfully." });
        }

        [HttpPost("verify-reset-otp")]
        public IActionResult VerifyResetOtp([FromBody] VerifyResetOtpRequest request)
        {
            if (_cache.TryGetValue(request.Email + "_RESET_OTP", out string? cachedOtp) && cachedOtp == request.Otp)
            {
                var resetToken = Guid.NewGuid().ToString();
                _cache.Set(request.Email + "_RESET_TOKEN", resetToken, TimeSpan.FromMinutes(10));
                _cache.Remove(request.Email + "_RESET_OTP");
                return Ok(new { token = resetToken });
            }
            return BadRequest("Invalid or expired reset code.");
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (_cache.TryGetValue(request.Email + "_RESET_TOKEN", out string? cachedToken) && cachedToken == request.Token)
            {
                var user = await _context.Users.SingleOrDefaultAsync(u => u.Email == request.Email);
                if (user != null)
                {
                    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
                    await _context.SaveChangesAsync();
                    _cache.Remove(request.Email + "_RESET_TOKEN");
                    return Ok(new { message = "Password reset successfully." });
                }
            }
            return BadRequest("Invalid or expired reset token.");
        }

        private string GetEmailTemplate(string name, string otp, string message)
        {
            var displayName = string.IsNullOrEmpty(name) ? "User" : name;
            return $@"<!DOCTYPE html>
<html>
<head>
<meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
<title>A1 Academy Verification</title>
</head>
<body style=""margin: 0; padding: 0; background-color: #ffffff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;"">
    <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: #ffffff;"">
        <tr>
            <td align=""center"">
                <!-- Main Email Card -->
                <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""600"" style=""background-color: #ffffff; max-width: 600px; width: 100%;"">
                    
                    <!-- Header -->
                    <tr>
                        <td align=""center"" style=""background-color: #ffffff; padding: 30px;"">
                            <h1 style=""color: #002045; margin: 0; font-size: 36px; letter-spacing: -0.5px; font-weight: bold;"">A1 Academy</h1>
                        </td>
                    </tr>
                    
                    <!-- Email Body -->
                    <tr>
                        <td style=""padding: 40px 40px 20px 40px; color: #181c1e;"">
                            <!-- Dynamic Name (Bold) -->
                            <p style=""font-size: 18px; line-height: 28px; margin: 0 0 20px 0;"">Hi <strong>{displayName}</strong>,</p>
                            
                            <p style=""font-size: 16px; line-height: 26px; margin: 0 0 30px 0;"">{message}</p>
                            
                            <!-- Golden Orange OTP Box -->
                            <div style=""text-align: center; background-color: #ffb55c; padding: 24px; border-radius: 8px; margin-bottom: 30px;"">
                                <!-- Dynamic OTP (Bold and Large) -->
                                <span style=""font-size: 36px; font-weight: 700; color: #001d37; letter-spacing: 6px;"">{otp}</span>
                            </div>
                            
                            <!-- Expiration Notice -->
                            <p style=""font-size: 14px; line-height: 24px; color: #74777f; margin: 0 0 20px 0;"">This code will expire in <strong>5 minutes</strong>.</p>
                            
                            <!-- Sign Off -->
                            <p style=""font-size: 16px; line-height: 26px; margin: 0;"">Welcome aboard!<br><strong style=""color: #002045;"">The A1 Academy Team</strong></p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align=""center"" style=""background-color: #ffffff; padding: 20px;"">
                            <p style=""font-size: 12px; color: #74777f; margin: 0;"">© {DateTime.Now.Year} A1 Academy. Scholarly excellence for the modern age.</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
        }
    }
}
