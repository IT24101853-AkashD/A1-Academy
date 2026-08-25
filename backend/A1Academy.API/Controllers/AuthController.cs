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

        public AuthController(AppDbContext context, IConfiguration configuration, IMemoryCache cache, IEmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _cache = cache;
            _emailService = emailService;
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

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromForm] RegisterRequest request)
        {
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
                IsEmailVerified = false,
                IsApproved = request.Role == "Teacher" ? false : true,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User registered successfully.", isApproved = user.IsApproved });
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
            
            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Unauthorized("Invalid email or password.");
            }

            if (!user.IsApproved)
            {
                return Unauthorized("Your account is pending administrator approval.");
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role)
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

        public class OtpRequest { public string Email { get; set; } = string.Empty; }
        public class VerifyOtpRequest { public string Email { get; set; } = string.Empty; public string Otp { get; set; } = string.Empty; }

        [HttpPost("send-otp")]
        public async Task<IActionResult> SendOtp([FromBody] OtpRequest request)
        {
            // We allow sending OTPs to any email because this is used for Registration where the user doesn't exist yet.
            var otp = new Random().Next(10000, 99999).ToString();
            Console.WriteLine($"SendOtp Called! Generated OTP '{otp}' for Email '{request.Email}'");
            _cache.Set(request.Email + "_OTP", otp, TimeSpan.FromMinutes(5));

            await _emailService.SendEmailAsync(request.Email, "A1 Academy - Verification Code", $"Your OTP is: {otp}. It expires in 5 minutes.");
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
                _cache.Remove(request.Email + "_OTP");
                return Ok(new { message = "Email successfully verified." });
            }
            return BadRequest("Invalid or expired OTP.");
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
            await _emailService.SendEmailAsync(request.Email, "A1 Academy - Password Reset Code", $"Your password reset code is: {otp}. It expires in 5 minutes.");
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
    }
}
