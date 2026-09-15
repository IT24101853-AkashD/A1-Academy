const fs = require('fs');
const path = require('path');

const authControllerPath = path.join(__dirname, '..', 'backend', 'A1Academy.API', 'Controllers', 'AuthController.cs');
let content = fs.readFileSync(authControllerPath, 'utf8');

// Add SkipEmailCheck to OtpRequest
content = content.replace(
    'public class OtpRequest { public string Email { get; set; } = string.Empty; public string FirstName { get; set; } = string.Empty; }',
    'public class OtpRequest { public string Email { get; set; } = string.Empty; public string FirstName { get; set; } = string.Empty; public bool SkipEmailCheck { get; set; } = false; }'
);

// Update SendOtp check
content = content.replace(
    /if \(await _context\.Users\.AnyAsync\(u => u\.Email == request\.Email\)\)/,
    'if (!request.SkipEmailCheck && await _context.Users.AnyAsync(u => u.Email == request.Email))'
);

fs.writeFileSync(authControllerPath, content, 'utf8');
console.log('Backend AuthController updated.');
