const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, '..', 'backend', 'A1Academy.API', 'Controllers', 'UsersController.cs');
let content = fs.readFileSync(controllerPath, 'utf8');

// 1. Add IEmailService to constructor
const constructorRegex = /private readonly AppDbContext _context;\s*public UsersController\(AppDbContext context\)\s*\{\s*_context = context;\s*\}/;
const constructorNew = `private readonly AppDbContext _context;
        private readonly IEmailService _emailService;

        public UsersController(AppDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }`;
content = content.replace(constructorRegex, constructorNew);

// 2. Update ApplyTransitionAsync to send emails
const transitionRegex = /user\.SecurityStamp = Guid\.NewGuid\(\)\.ToString\("N"\);\s*await _context\.SaveChangesAsync\(\);/;
const transitionNew = `user.SecurityStamp = Guid.NewGuid().ToString("N");

            await _context.SaveChangesAsync();

            if (action == AccountStatusTransitions.Deactivate)
            {
                var body = GetStatusEmailTemplate(user.FirstName, "Your account has been deactivated by the administrator.", "Please contact the admin if you believe this was a mistake or need further assistance.");
                await _emailService.SendEmailAsync(user.Email, "A1 Academy - Account Deactivated", body);
            }
            else if (action == AccountStatusTransitions.Reactivate)
            {
                var body = GetStatusEmailTemplate(user.FirstName, "Your account has been successfully reactivated.", "You can now log in and resume using the platform normally.");
                await _emailService.SendEmailAsync(user.Email, "A1 Academy - Account Reactivated", body);
            }`;
content = content.replace(transitionRegex, transitionNew);

// 3. Add GetStatusEmailTemplate
const addTemplateRegex = /}\s*}\s*$/;
const addTemplateNew = `
        private string GetStatusEmailTemplate(string name, string messageTitle, string messageBody)
        {
            var displayName = string.IsNullOrEmpty(name) ? "User" : name;
            return $@"<!DOCTYPE html>
<html>
<head>
<meta charset=\""UTF-8\"">
<meta name=\""viewport\"" content=\""width=device-width, initial-scale=1.0\"">
<title>A1 Academy Notification</title>
</head>
<body style=\""margin: 0; padding: 0; background-color: #ffffff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\"">
    <table border=\""0\"" cellpadding=\""0\"" cellspacing=\""0\"" width=\""100%\"" style=\""background-color: #ffffff;\"">
        <tr>
            <td align=\""center\"">
                <table border=\""0\"" cellpadding=\""0\"" cellspacing=\""0\"" width=\""600\"" style=\""background-color: #ffffff; max-width: 600px; width: 100%;\"">
                    <tr>
                        <td align=\""center\"" style=\""background-color: #ffffff; padding: 30px;\"">
                            <h1 style=\""color: #002045; margin: 0; font-size: 36px; letter-spacing: -0.5px; font-weight: bold;\"">A1 Academy</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style=\""padding: 40px 40px; background-color: #f8fafc; border-radius: 24px;\"">
                            <h2 style=\""margin-top: 0; margin-bottom: 24px; color: #0f172a; font-size: 24px; font-weight: bold;\"">Hi {displayName},</h2>
                            <p style=\""margin: 0 0 24px 0; color: #334155; font-size: 16px; line-height: 1.6;\"">
                                {messageTitle}
                            </p>
                            <p style=\""margin: 0 0 24px 0; color: #334155; font-size: 16px; line-height: 1.6;\"">
                                {messageBody}
                            </p>
                            <p style=\""margin: 0; color: #334155; font-size: 16px; line-height: 1.6;\"">
                                Best regards,<br>
                                <strong style=\""color: #0f172a;\"">A1 Academy Admin Team</strong>
                            </p>
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
}`;
content = content.replace(addTemplateRegex, addTemplateNew);

fs.writeFileSync(controllerPath, content, 'utf8');
console.log('Fixed UsersController backend emails.');
