const fs = require('fs');
const files = [
    '.github/workflows/ci-admin.yml',
    '.github/workflows/ci-auth.yml',
    '.github/workflows/ci-student.yml',
    '.github/workflows/ci-teacher.yml',
    '.github/workflows/ci-gateway.yml'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/branches:\s*\[\s*"main"\s*,\s*"feature\/\*"\s*\]/, 'branches: [ "main" ]');
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    } else {
        console.log(`File not found: ${file}`);
    }
});
