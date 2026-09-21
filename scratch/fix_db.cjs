const fs = require('fs');
const path = require('path');

const services = ['AuthService', 'AdminService', 'TeacherService', 'StudentService'];

for (const service of services) {
    const appSetPath = path.join(__dirname, `../backend/A1Academy.${service}/appsettings.json`);
    if (!fs.existsSync(appSetPath)) continue;
    let appSet = fs.readFileSync(appSetPath, 'utf8');
    appSet = appSet.replace(
        /Host=localhost;Port=5433;Database=appdb;Username=appuser;Password=[^"']+/g,
        'Host=a1-academy-dbserver.postgres.database.azure.com;Port=5432;Database=appdb;Username=appuser;Password=SecurePassword123!;Ssl Mode=Require;'
    );
    fs.writeFileSync(appSetPath, appSet);
}
console.log('Fixed Database connection strings.');
