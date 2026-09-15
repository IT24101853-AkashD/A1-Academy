const fs = require('fs');
const path = './frontend/src/components/AuthModals.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Google Login replacement
const googleTarget = `                    window.dispatchEvent(new Event('auth-change'));\n                    closeModal();\n                    openModal('success-login-modal');`;
const googleReplacement = `                    window.dispatchEvent(new Event('auth-change'));\n                    closeModal();\n                    if (result.role === 'Admin') {\n                        window.location.href = '/admin';\n                    } else {\n                        openModal('success-login-modal');\n                    }`;
content = content.replace(googleTarget, googleReplacement);

// 2. Standard Login replacement
const standardTarget = `                localStorage.setItem('role', result.role);\n                    window.dispatchEvent(new Event('auth-change'));\n                closeModal();\n                openModal('success-login-modal');`;
const standardReplacement = `                localStorage.setItem('role', result.role);\n                window.dispatchEvent(new Event('auth-change'));\n                closeModal();\n                if (result.role === 'Admin') {\n                    window.location.href = '/admin';\n                } else {\n                    openModal('success-login-modal');\n                }`;
content = content.replace(standardTarget, standardReplacement);

fs.writeFileSync(path, content, 'utf8');
console.log('Update completed successfully.');
