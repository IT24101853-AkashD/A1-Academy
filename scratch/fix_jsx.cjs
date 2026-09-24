const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../frontend/src/components/modals');
const filesToFix = [
    'LoginRoleStudent.jsx',
    'RegisterModal.jsx',
    'RoleSelectStudent.jsx',
    'OtpStudentModal.jsx',
    'OtpResetModal.jsx',
    'OtpTeacherModal.jsx'
];

for (const file of filesToFix) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');

    // Replace HTML comments with JSX comments
    content = content.replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}');

    // Check if missing closing divs
    if (file === 'RegisterModal.jsx') {
       if (!content.includes('</div>\n</div>\n    );')) {
            content = content.replace('</button>\n    );', '</button>\n    </div>\n</div>\n    );');
       }
    }

    // Fix adjacent JSX elements by wrapping the return in a fragment
    if (content.includes('return (\n<div')) {
        content = content.replace('return (\n<div', 'return (\n<>\n<div');
        content = content.replace(/\n\s*\);\n\s*\}\s*$/, '\n</>\n    );\n}');
    }

    fs.writeFileSync(filePath, content);
}
console.log('Fixed JSX files.');
