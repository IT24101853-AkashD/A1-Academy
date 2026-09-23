import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { clearSession } from '../utils/session';

// Teacher-facing "My Classes" - lists a Teacher's own scheduled classes (AA-43) with a Cancel
// action (AA-44).
export default function TeacherClassesPage() {
    const [viewState, setViewState] = useState('idle'); // idle | loading | success | sessionEnded | error
    const [classes, setClasses] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [cancellingId, setCancellingId] = useState(null);
    const [confirmingId, setConfirmingId] = useState(null);

    const load = () => {
        const token = localStorage.getItem('token');
        setViewState('loading');

        fetch(`${import.meta.env.VITE_API_URL}/api/teacher/classes`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
                if (res.status === 401) {
                    clearSession();
                    setViewState('sessionEnded');
                    return null;
                }
                if (!res.ok) {
                    throw new Error(`Request failed with status ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                if (data) {
                    setClasses(data);
                    setViewState('success');
                }
            })
            .catch((err) => {
                setErrorMessage(err.message || 'Server connection error.');
                setViewState('error');
            });
    };

    useEffect(load, []);

    const cancelClass = async (id) => {
        setCancellingId(id);
        setConfirmingId(null);
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/teacher/classes/${id}/cancel`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401) {
                clearSession();
                setViewState('sessionEnded');
                return;
            }
            if (!res.ok) {
                setErrorMessage('Could not cancel this class. Please try again.');
                return;
            }

            setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'Cancelled' } : c)));
        } catch {
            setErrorMessage('Server connection error. Please try again.');
        } finally {
            setCancellingId(null);
        }
    };

    return (
        <Layout>
            <section className="py-24 px-6 max-w-7xl mx-auto w-full min-h-[60vh]">
                {viewState === 'sessionEnded' && (
                    <div className="max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-[24px] shadow-level-2 border border-slate-100 dark:border-slate-700 p-10 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] text-amber-500 dark:text-amber-400">lock_clock</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Session Ended</h2>
                        <a href="/" className="inline-block px-6 py-3 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors">Back to Home</a>
                    </div>
                )}

                {viewState === 'loading' && (
                    <div className="text-center py-20">
                        <span className="material-symbols-outlined text-[40px] text-slate-400 dark:text-slate-500 animate-spin">progress_activity</span>
                    </div>
                )}

                {viewState === 'error' && (
                    <div className="max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-[24px] shadow-level-2 border border-slate-100 dark:border-slate-700 p-10 text-center">
                        <p className="text-base font-bold text-red-500 dark:text-red-400">{errorMessage}</p>
                    </div>
                )}

                {viewState === 'success' && (
                    <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                            <div>
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 font-jakarta">
                                    <span className="material-symbols-outlined text-[16px]">school</span>
                                    My Classes
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-jakarta">Classes You're Teaching</h1>
                            </div>
                            <Link
                                to="/teacher/classes/new"
                                className="px-6 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition-all self-start"
                            >
                                + Schedule a Class
                            </Link>
                        </div>

                        {classes.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800 rounded-[24px] border border-slate-200 dark:border-slate-700/80 p-12 text-center shadow-level-1 max-w-md mx-auto my-8">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No classes scheduled yet</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Schedule your first class to get started.</p>
                                <Link to="/teacher/classes/new" className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all">
                                    Schedule a Class
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {classes.map((cls) => {
                                    const isCancelled = cls.status === 'Cancelled';
                                    return (
                                        <div key={cls.id} className={`bg-white dark:bg-slate-800 rounded-[24px] border p-6 shadow-level-1 flex flex-col justify-between relative overflow-hidden ${isCancelled ? 'border-slate-300 dark:border-slate-600 opacity-80' : 'border-slate-200 dark:border-slate-700/80'}`}>
                                            {isCancelled && (
                                                <div className="absolute top-0 right-0 left-0 bg-rose-50 text-rose-700 py-1 text-center text-[10px] font-bold uppercase tracking-wider border-b border-rose-200">
                                                    Cancelled
                                                </div>
                                            )}
                                            <div className={isCancelled ? 'pt-4' : ''}>
                                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">{cls.categoryName}</span>
                                                <Link to={`/teacher/classes/${cls.id}`} className="block text-lg font-bold text-slate-900 dark:text-white mt-3 mb-2 font-jakarta hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                                                    {cls.name}
                                                </Link>
                                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-slate-500">calendar_month</span>
                                                        <span>{new Date(cls.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-slate-500">group</span>
                                                        <span>{cls.enrolledCount} / {cls.capacity} enrolled</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                                                <Link to={`/teacher/classes/${cls.id}`} className="flex-1 py-2 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold text-center transition-all">
                                                    Manage
                                                </Link>
                                                {!isCancelled && (
                                                    confirmingId === cls.id ? (
                                                        <button
                                                            onClick={() => cancelClass(cls.id)}
                                                            disabled={cancellingId === cls.id}
                                                            className="flex-1 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all disabled:opacity-60"
                                                        >
                                                            Confirm Cancel
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConfirmingId(cls.id)}
                                                            className="flex-1 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-all"
                                                        >
                                                            Cancel Class
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </section>
        </Layout>
    );
}
