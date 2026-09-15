const fs = require('fs');
const path = './frontend/src/components/AuthModals.jsx';
let content = fs.readFileSync(path, 'utf8');

// Use regex to catch varying whitespace
const regex = /window\.dispatchEvent\(new Event\('auth-change'\)\);\s*closeModal\(\);\s*openModal\('success-login-modal'\);/g;

const replacement = `window.dispatchEvent(new Event('auth-change'));\n                closeModal();\n                if (result.role === 'Admin') {\n                    window.location.href = '/admin';\n                } else {\n                    openModal('success-login-modal');\n                }`;

content = content.replace(regex, replacement);
fs.writeFileSync(path, content, 'utf8');
console.log('Update completed successfully.');
