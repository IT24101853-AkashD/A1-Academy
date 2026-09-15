const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, '..', 'backend', 'A1Academy.API', 'Controllers', 'UsersController.cs');
let content = fs.readFileSync(controllerPath, 'utf8');

const oldTemplateStart = 'private string GetStatusEmailTemplate(string name, string messageTitle, string messageBody)';
const oldTemplateRegex = /private string GetStatusEmailTemplate\(string name, string messageTitle, string messageBody\)[\s\S]*?}\s*}\s*}$/;

const newTemplate = `private string GetStatusEmailTemplate(string name, string messageTitle, string messageBody)
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
                <!-- Main Email Card -->
                <table border=\""0\"" cellpadding=\""0\"" cellspacing=\""0\"" width=\""600\"" style=\""background-color: #ffffff; max-width: 600px; width: 100%;\"">
                    
                    <!-- Header -->
                    <tr>
                        <td align=\""center\"" style=\""background-color: #ffffff; padding: 30px;\"">
                            <h1 style=\""color: #002045; margin: 0; font-size: 36px; letter-spacing: -0.5px; font-weight: bold;\"">A1 Academy</h1>
                        </td>
                    </tr>
                    
                    <!-- Email Body -->
                    <tr>
                        <td style=\""padding: 40px 40px 20px 40px; color: #181c1e;\"">
                            <!-- Dynamic Name (Bold) -->
                            <p style=\""font-size: 18px; line-height: 28px; margin: 0 0 20px 0;\"">Hi <strong>{displayName}</strong>,</p>
                            
                            <p style=\""font-size: 16px; line-height: 26px; margin: 0 0 20px 0;\"">{messageTitle}</p>
                            <p style=\""font-size: 16px; line-height: 26px; margin: 0 0 30px 0;\"">{messageBody}</p>
                            
                            <!-- Sign Off -->
                            <p style=\""font-size: 16px; line-height: 26px; margin: 0;\"">Best regards,<br><strong style=\""color: #002045;\"">The A1 Academy Team</strong></p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align=\""center\"" style=\""background-color: #ffffff; padding: 20px;\"">
                            <p style=\""font-size: 12px; color: #74777f; margin: 0;\"">Â© {DateTime.Now.Year} A1 Academy. Scholarly excellence for the modern age.</p>
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

content = content.replace(oldTemplateRegex, newTemplate);

fs.writeFileSync(controllerPath, content, 'utf8');
console.log('Fixed email fonts in UsersController.');
