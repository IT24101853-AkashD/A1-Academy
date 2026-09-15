const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'src', 'pages', 'AdminUsersPage.jsx');
let content = fs.readFileSync(pagePath, 'utf8');

// 1. Fix method POST -> PATCH
content = content.replace(
    "method: isDelete ? 'DELETE' : 'POST',",
    "method: isDelete ? 'DELETE' : 'PATCH',"
);

// 2. Add popups to Deactivate/Reactivate
content = content.replace(
    "onClick={() => runAccountAction(user, 'deactivate')}",
    "onClick={() => { if(window.confirm('Do you want to deactivate? Yes or Cancel')) runAccountAction(user, 'deactivate'); }}"
);
content = content.replace(
    "onClick={() => runAccountAction(user, 'reactivate')}",
    "onClick={() => { if(window.confirm('Do you want to activate? Yes or Cancel')) runAccountAction(user, 'reactivate'); }}"
);

fs.writeFileSync(pagePath, content, 'utf8');
console.log('Fixed AdminUsersPage.');
