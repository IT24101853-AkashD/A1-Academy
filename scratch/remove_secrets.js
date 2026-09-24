const fs = require('fs');
const path = require('path');

const services = ['AdminService', 'AuthService', 'StudentService', 'TeacherService'];
services.forEach(svc => {
    const file = path.join('backend', `A1Academy.${svc}`, 'appsettings.json');
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        // Replace the specific compromised password with an empty string
        content = content.replace(/"SmtpPassword":\s*"guobksxuovxnfton"/g, '"SmtpPassword": ""');
        fs.writeFileSync(file, content);
        console.log(`Cleaned ${file}`);
    }
});
