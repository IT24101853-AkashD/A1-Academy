using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using A1Academy.Shared.Data.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace A1Academy.AuthService.Services
{
    // Bound from the "Jwt" configuration section. In production Jwt:Key comes from the
    // Container App secret "jwt-key" (environment variable Jwt__Key), never from a committed file.
    public class JwtSettings
    {
        public string Key { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public string Audience { get; set; } = string.Empty;
    }

    // The one place sign-in tokens are created, for both email/password and Google sign-in, so
    // the claims, lifetime and signing key can't drift apart between the two.
    public class JwtTokenService
    {
        private static readonly TimeSpan Lifetime = TimeSpan.FromDays(7);

        private readonly JwtSettings _settings;
        private readonly SigningCredentials _signingCredentials;

        public JwtTokenService(IOptions<JwtSettings> options)
        {
            _settings = options.Value;
            _signingCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Key)),
                SecurityAlgorithms.HmacSha256Signature);
        }

        public string CreateToken(User user)
        {
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role),
                    new Claim(User.SecurityStampClaimType, user.SecurityStamp)
                }),
                Expires = DateTime.UtcNow.Add(Lifetime),
                Issuer = _settings.Issuer,
                Audience = _settings.Audience,
                SigningCredentials = _signingCredentials
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            return tokenHandler.WriteToken(tokenHandler.CreateToken(tokenDescriptor));
        }
    }
}
