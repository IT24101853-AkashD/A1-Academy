const fs = require('fs');
const path = require('path');

const authControllerPath = path.join(__dirname, '..', 'backend', 'A1Academy.API', 'Controllers', 'AuthController.cs');
let content = fs.readFileSync(authControllerPath, 'utf8');

const endpointHtml = `
        public class UpdateCredentialsRequest { public string CurrentEmail { get; set; } = string.Empty; public string? NewEmail { get; set; } public string? NewPassword { get; set; } }

        [HttpPut("me/credentials")]
        public async Task<IActionResult> UpdateCredentials([FromBody] UpdateCredentialsRequest request)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var user = await _context.Users.SingleOrDefaultAsync(u => u.Id == userId);
            if (user == null || user.AccountStatus != AccountStatus.Active)
                return Unauthorized();

            if (user.Email != request.CurrentEmail)
                return BadRequest("Invalid current email provided.");

            if (!string.IsNullOrWhiteSpace(request.NewEmail))
            {
                var exists = await _context.Users.AnyAsync(u => u.Email == request.NewEmail && u.Id != userId);
                if (exists) return BadRequest("That email is already in use.");
                user.Email = request.NewEmail;
            }

            if (!string.IsNullOrWhiteSpace(request.NewPassword))
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            }

            // Always force sign out by updating security stamp
            user.SecurityStamp = Guid.NewGuid().ToString();
            await _context.SaveChangesAsync();

            return Ok(new { message = "Credentials updated successfully." });
        }
`;

const replaceTarget = `        [HttpPut("me")]`;
content = content.replace(replaceTarget, endpointHtml + '\n' + replaceTarget);

fs.writeFileSync(authControllerPath, content, 'utf8');
console.log('AuthController updated successfully.');
