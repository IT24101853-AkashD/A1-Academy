const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, 'src', 'pages', 'AdminDashboard.jsx');
let content = fs.readFileSync(dashboardPath, 'utf8');

// 1. Add state variables
content = content.replace(
    "const [firstName, setFirstName] = useState('');",
    "const [firstName, setFirstName] = useState('');\n    const [pendingTeachers, setPendingTeachers] = useState([]);\n    const [pendingCount, setPendingCount] = useState(0);\n    const [pendingActionId, setPendingActionId] = useState(null);"
);

// 2. Add runAccountAction
const runActionCode = `
    const runAccountAction = async (user, action) => {
        setPendingActionId(user.id);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(\`\${import.meta.env.VITE_API_URL}/api/users/\${user.id}/\${action}\`, {
                method: 'PATCH',
                headers: { Authorization: \`Bearer \${token}\` },
            });
            if (res.ok) {
                setPendingTeachers(prev => prev.filter(u => u.id !== user.id));
                setPendingCount(prev => Math.max(prev - 1, 0));
            }
        } catch (err) {
            console.error('Action failed', err);
        } finally {
            setPendingActionId(null);
        }
    };

    useEffect(() => {`;
content = content.replace("useEffect(() => {", runActionCode);

// 3. Add fetch logic into useEffect
const fetchLogic = `fetch(import.meta.env.VITE_API_URL + '/api/users?role=Teacher&status=Pending&page=1&pageSize=3', {
                headers: { Authorization: \`Bearer \${token}\` }
            })
            .then(res => res.json())
            .then(data => {
                if (data && data.items) {
                    setPendingTeachers(data.items);
                    setPendingCount(data.totalCount || 0);
                }
            })
            .catch(err => console.error('Failed to fetch pending teachers:', err));
        }
    }, []);`;
content = content.replace("}\n    }, []);", fetchLogic);

// 4. Update the Top Pending Stat
content = content.replace(
    /<p className="text-3xl font-extrabold text-slate-900">12<\/p>/,
    '<p className="text-3xl font-extrabold text-slate-900">{pendingCount}</p>'
);

// 5. Replace Needs Attention widget
const oldWidgetRegex = /<h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center justify-between">[\s\S]*?View all 12 pending[\s\S]*?<\/button>\s*<\/div>/;

const newWidget = `<h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center justify-between">
                                Needs Attention
                                <span className="material-symbols-outlined text-amber-500">notification_important</span>
                            </h2>
                            <div className="space-y-6">
                                {pendingTeachers.length === 0 ? (
                                    <div className="text-center py-6">
                                        <p className="text-slate-500 font-medium text-sm">All caught up! No pending applications.</p>
                                    </div>
                                ) : (
                                    pendingTeachers.map((user) => {
                                        const nameParts = (user.name || user.email || 'U').trim().split(' ');
                                        const initials = nameParts.length > 1 
                                            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                                            : nameParts[0].substring(0, 2).toUpperCase();

                                        return (
                                            <div key={user.id} className="flex gap-4">
                                                <div className="w-10 h-10 rounded-full bg-amber-100 flex-shrink-0 flex items-center justify-center text-amber-700 font-bold text-sm">
                                                    {initials}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{user.name}</p>
                                                    <p className="text-xs font-medium text-slate-500 mb-2">Applied for Teacher role</p>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            disabled={pendingActionId === user.id}
                                                            onClick={() => runAccountAction(user, 'approve')}
                                                            className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
                                                        >
                                                            {pendingActionId === user.id ? 'Working...' : 'Approve'}
                                                        </button>
                                                        <Link 
                                                            to="/admin/users"
                                                            className="px-3 py-1 bg-slate-50 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                                                        >
                                                            Review
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}

                                <Link to="/admin/users" className="block w-full text-center text-sm font-bold text-blue-600 hover:text-blue-700 pt-4 border-t border-slate-100 cursor-pointer">
                                    {pendingCount > 0 ? \`View all \${pendingCount} pending\` : 'Go to User Directory'}
                                </Link>
                            </div>`;

if (oldWidgetRegex.test(content)) {
    content = content.replace(oldWidgetRegex, newWidget);
    fs.writeFileSync(dashboardPath, content, 'utf8');
    console.log('Successfully updated AdminDashboard dynamic logic.');
} else {
    console.log('Regex did not match for Needs Attention widget!');
}
