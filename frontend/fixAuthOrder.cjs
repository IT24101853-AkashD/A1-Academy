const fs = require('fs');
const path = require('path');

const authPath = path.join(__dirname, '..', 'backend', 'A1Academy.API', 'Controllers', 'AuthController.cs');
let content = fs.readFileSync(authPath, 'utf8');

const oldLogic = `            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Unauthorized("Invalid email or password.");
            }

            if (user.AccountStatus != AccountStatus.Active)
            {
                return Unauthorized(LoginBlockedMessage(user.AccountStatus));
            }`;

const newLogic = `            if (user.AccountStatus != AccountStatus.Active)
            {
                return Unauthorized(LoginBlockedMessage(user.AccountStatus));
            }

            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Unauthorized("Invalid email or password.");
            }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(authPath, content, 'utf8');
console.log('Fixed AuthController logic order.');
