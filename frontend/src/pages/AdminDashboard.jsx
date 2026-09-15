import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const role = localStorage.getItem('role');
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState('');
    const [pendingTeachers, setPendingTeachers] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [pendingActionId, setPendingActionId] = useState(null);

    
    const runAccountAction = async (user, action) => {
        setPendingActionId(user.id);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/${user.id}/${action}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
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

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetch(import.meta.env.VITE_API_URL + '/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data && data.firstName) {
                    setFirstName(data.firstName);
                }
            })
            .catch(err => console.error('Failed to fetch profile:', err));
        fetch(import.meta.env.VITE_API_URL + '/api/users?role=Teacher&status=Pending&page=1&pageSize=3', {
                headers: { Authorization: `Bearer ${token}` }
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
    }, []);

    useEffect(() => {
        if (window.AOS) {
            window.AOS.init({
                once: false,
                offset: 50,
                duration: 800,
                easing: 'ease-out-cubic'
            });
        }
    }, []);

    if (role !== 'Admin') {
        return <Navigate to="/" />;
    }

    return (
        <div className="flex-grow flex flex-col font-jakarta text-slate-900">
            {/* Custom Background exactly from HTML */}
            <div className="fixed inset-0 z-[-1] gradient-bg"></div>

            <main className="flex-grow pt-20">
                {/* Dashboard Header */}
                <section className="pt-8 pb-12 px-6 max-w-7xl mx-auto">
                    <div data-aos="fade-up" className="mb-8">
                        <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 gradient-text pt-4 pb-2">Welcome back, {firstName || 'Admin'}.</h1>
                        <p className="text-xl text-slate-500 font-medium max-w-2xl">
                            Here's what's happening across A1 Academy today. Manage your users, categories, and system health from one central hub.
                        </p>
                    </div>

                    {/* KPI Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                        <div data-aos="fade-up" data-aos-delay="100" className="glass-card rounded-3xl p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl">groups</span>
                                </div>
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full">+12%</span>
                            </div>
                            <h3 className="text-slate-500 font-semibold text-sm mb-1">Total Users</h3>
                            <p className="text-3xl font-extrabold text-slate-900">1,248</p>
                        </div>

                        <div data-aos="fade-up" data-aos-delay="200" className="glass-card rounded-3xl p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl">school</span>
                                </div>
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full">+4%</span>
                            </div>
                            <h3 className="text-slate-500 font-semibold text-sm mb-1">Active Teachers</h3>
                            <p className="text-3xl font-extrabold text-slate-900">84</p>
                        </div>

                        <div data-aos="fade-up" data-aos-delay="300" className="glass-card rounded-3xl p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl">hourglass_top</span>
                                </div>
                                <span className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full">Action Needed</span>
                            </div>
                            <h3 className="text-slate-500 font-semibold text-sm mb-1">Pending Approvals</h3>
                            <p className="text-3xl font-extrabold text-slate-900">{pendingCount}</p>
                        </div>

                        <div data-aos="fade-up" data-aos-delay="400" className="glass-card rounded-3xl p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl">category</span>
                                </div>
                            </div>
                            <h3 className="text-slate-500 font-semibold text-sm mb-1">Total Categories</h3>
                            <p className="text-3xl font-extrabold text-slate-900">45</p>
                        </div>
                    </div>

                    {/* Quick Actions & Tasks */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Quick Links */}
                        <div className="lg:col-span-2 space-y-6">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500">dashboard</span> 
                                Quick Access
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Link to="/admin/users" data-aos="fade-right" className="block group bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all hover:border-blue-200">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 flex items-center justify-center mb-6 transition-colors">
                                        <span className="material-symbols-outlined text-3xl">manage_accounts</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">User Directory</h3>
                                    <p className="text-slate-500 font-medium mb-6">
                                        View, approve, and manage all students and teachers on the platform.
                                    </p>
                                    <div className="text-blue-600 font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                                        Manage Users <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </div>
                                </Link>

                                <Link to="/admin/categories" data-aos="fade-left" className="block group bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all hover:border-violet-200">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 group-hover:bg-violet-50 text-slate-600 group-hover:text-violet-600 flex items-center justify-center mb-6 transition-colors">
                                        <span className="material-symbols-outlined text-3xl">auto_awesome_mosaic</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">Categories</h3>
                                    <p className="text-slate-500 font-medium mb-6">
                                        Organize subject areas, add new learning paths, and structure the catalog.
                                    </p>
                                    <div className="text-violet-600 font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                                        Manage Categories <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </div>
                                </Link>

                            </div>
                        </div>

                        {/* Recent Activity Widget */}
                        <div data-aos="fade-up" className="glass-card rounded-3xl p-8">
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center justify-between">
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
                                    {pendingCount > 0 ? `View all ${pendingCount} pending` : 'Go to User Directory'}
                                </Link>
                            </div>
                        </div>

                    </div>
                </section>
            </main>
        </div>
    );
}
