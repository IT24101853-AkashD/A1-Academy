const fs = require('fs');
const path = require('path');

const modalPath = path.join(__dirname, 'src', 'components', 'AuthModals.jsx');
let content = fs.readFileSync(modalPath, 'utf8');

content = content.replace(
    /{isSendingOtp === 'admin-current-email' \? \(/g,
    '{isSendingOtp ? ('
);

content = content.replace(
    /{isSendingOtp === 'admin-new-email' \? \(/g,
    '{isSendingOtp ? ('
);

fs.writeFileSync(modalPath, content, 'utf8');
console.log('Fixed AuthModals.jsx');
