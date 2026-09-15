const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, '..', 'backend', 'A1Academy.API', 'Controllers', 'AuthController.cs');
let content = fs.readFileSync(controllerPath, 'utf8');

content = content.replace(
    'AccountStatus.Deactivated => "Your account has been deactivated. Please contact support.",',
    'AccountStatus.Deactivated => "This Email is Deactivated contact the admin",'
);

fs.writeFileSync(controllerPath, content, 'utf8');
console.log('Fixed AuthController deactivated message.');
