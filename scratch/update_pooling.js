const fs = require('fs');

const services = ['AuthService', 'AdminService', 'TeacherService', 'StudentService'];
services.forEach(svc => {
    const file = `backend/A1Academy.${svc}/Program.cs`;
    if(fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/AddDbContext</g, 'AddDbContextPool<');
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});

const scriptFile = 'scripts/devops-azure-setup.sh';
if (fs.existsSync(scriptFile)) {
    let content = fs.readFileSync(scriptFile, 'utf8');
    content = content.replace(
        '"ConnectionStrings__DefaultConnection=$DB_CONNECTION_STRING" \\',
        '"ConnectionStrings__DefaultConnection=${DB_CONNECTION_STRING};Pooling=true;Max Pool Size=100;" \\'
    );
    fs.writeFileSync(scriptFile, content);
    console.log(`Updated ${scriptFile}`);
}
