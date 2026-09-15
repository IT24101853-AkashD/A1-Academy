const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, 'src', 'pages', 'AdminDashboard.jsx');
let content = fs.readFileSync(dashboardPath, 'utf8');

// 1. Add useState to imports
content = content.replace(
    "import React, { useEffect } from 'react';",
    "import React, { useEffect, useState } from 'react';"
);

// 2. Add state and fetch logic
const componentStartRegex = /export default function AdminDashboard\(\) \{\s*const role = localStorage\.getItem\('role'\);\s*const navigate = useNavigate\(\);/;
const fetchLogic = `export default function AdminDashboard() {
    const role = localStorage.getItem('role');
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetch(import.meta.env.VITE_API_URL + '/api/auth/me', {
                headers: { Authorization: \`Bearer \${token}\` }
            })
            .then(res => res.json())
            .then(data => {
                if (data && data.firstName) {
                    setFirstName(data.firstName);
                }
            })
            .catch(err => console.error('Failed to fetch profile:', err));
        }
    }, []);`;
content = content.replace(componentStartRegex, fetchLogic);

// 3. Replace "Welcome back, Admin."
content = content.replace(
    /<h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 gradient-text pt-4 pb-2">Welcome back, Admin\.<\/h1>/,
    '<h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 gradient-text pt-4 pb-2">Welcome back, {firstName || \'Admin\'}.</h1>'
);

fs.writeFileSync(dashboardPath, content, 'utf8');
console.log('Fixed AdminDashboard profile fetch.');
