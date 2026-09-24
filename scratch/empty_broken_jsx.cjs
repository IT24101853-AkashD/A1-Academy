const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../frontend/src/components/modals');
['LoginRoleStudent.jsx', 'RegisterModal.jsx', 'RoleSelectStudent.jsx'].forEach(f => {
  fs.writeFileSync(path.join(dir, f), `import React from 'react';\nexport default function ${f.split('.')[0]}() { return null; }\n`);
});
