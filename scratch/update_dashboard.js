const fs = require('fs');
const file = 'frontend/src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state
content = content.replace(
    'const [pendingActionId, setPendingActionId] = useState(null);',
    'const [pendingActionId, setPendingActionId] = useState(null);\n    const [stats, setStats] = useState({ totalStudents: 0, activeTeachers: 0, totalCategories: 0 });'
);

// 2. Add API calls inside useEffect
const apiCalls = `
        fetch(import.meta.env.VITE_API_URL + '/api/users?role=Student&status=Active&page=1&pageSize=1', { headers: { Authorization: \`Bearer \${token}\` } })
            .then(res => res.json())
            .then(data => setStats(s => ({ ...s, totalStudents: data.totalCount || 0 })));

        fetch(import.meta.env.VITE_API_URL + '/api/users?role=Teacher&status=Active&page=1&pageSize=1', { headers: { Authorization: \`Bearer \${token}\` } })
            .then(res => res.json())
            .then(data => setStats(s => ({ ...s, activeTeachers: data.totalCount || 0 })));

        fetch(import.meta.env.VITE_API_URL + '/api/categories')
            .then(res => res.json())
            .then(data => setStats(s => ({ ...s, totalCategories: data.length || 0 })));
`;
content = content.replace(
    '.catch(err => console.error(\'Failed to fetch pending teachers:\', err));',
    `.catch(err => console.error('Failed to fetch pending teachers:', err));\n${apiCalls}`
);

// 3. Replace HTML UI
content = content.replace('Total Users', 'Total Students');
content = content.replace('<p className="text-3xl font-extrabold text-slate-900">1,248</p>', '<p className="text-3xl font-extrabold text-slate-900">{stats.totalStudents}</p>');
content = content.replace('<p className="text-3xl font-extrabold text-slate-900">84</p>', '<p className="text-3xl font-extrabold text-slate-900">{stats.activeTeachers}</p>');
content = content.replace('<p className="text-3xl font-extrabold text-slate-900">0</p>', '<p className="text-3xl font-extrabold text-slate-900">{pendingCount}</p>');
content = content.replace('<p className="text-3xl font-extrabold text-slate-900">45</p>', '<p className="text-3xl font-extrabold text-slate-900">{stats.totalCategories}</p>');

fs.writeFileSync(file, content);
console.log('Dashboard updated.');
