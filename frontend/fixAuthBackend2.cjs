const fs = require('fs');
const path = require('path');

const authControllerPath = path.join(__dirname, '..', 'backend', 'A1Academy.API', 'Controllers', 'AuthController.cs');
let content = fs.readFileSync(authControllerPath, 'utf8');

// Undo the generic replace
content = content.replace(
    /if \(!request\.SkipEmailCheck && await _context\.Users\.AnyAsync\(u => u\.Email == request\.Email\)\)/g,
    'if (await _context.Users.AnyAsync(u => u.Email == request.Email))'
);

// Now apply it ONLY to SendOtp
const sendOtpStart = 'public async Task<IActionResult> SendOtp([FromBody] OtpRequest request)\r\n        {\r\n            if (await _context.Users.AnyAsync(u => u.Email == request.Email))';
const sendOtpEnd = 'public async Task<IActionResult> SendOtp([FromBody] OtpRequest request)\r\n        {\r\n            if (!request.SkipEmailCheck && await _context.Users.AnyAsync(u => u.Email == request.Email))';

content = content.replace(sendOtpStart, sendOtpEnd);

// Try with \n if \r\n fails
const sendOtpStart2 = 'public async Task<IActionResult> SendOtp([FromBody] OtpRequest request)\n        {\n            if (await _context.Users.AnyAsync(u => u.Email == request.Email))';
const sendOtpEnd2 = 'public async Task<IActionResult> SendOtp([FromBody] OtpRequest request)\n        {\n            if (!request.SkipEmailCheck && await _context.Users.AnyAsync(u => u.Email == request.Email))';
content = content.replace(sendOtpStart2, sendOtpEnd2);

fs.writeFileSync(authControllerPath, content, 'utf8');
console.log('Backend AuthController updated correctly.');
