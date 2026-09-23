import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { clearSession } from '../utils/session';

// Student's "My Classes" dashboard (AA-46/AA-13) - every class the Student is enrolled in,
// including ones the Teacher has since cancelled (AA-44 Scenario 2), so that status stays
// visible here instead of the class just disappearing.
export default function StudentMyClassesPage() {
    const [viewState, setViewState] = useState('idle'); // idle | loading | success | sessionEnded | error
    const [classes, setClasses] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        setViewState('loading');

        fetch(`${import.meta.env.VITE_API_URL}/api/student/classes/mine`, {
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
    }, []);

    return (
        <Layout>
            <section className="py-24 px-6 max-w-7xl mx-auto w-full min-h-[60vh]">
                {viewState === 'sessionEnded' && (
                    <div className="max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-[24px] shadow-level-2 border border-slate-100 dark:border-slate-700 p-10 text-center">
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
                        <div className="mb-8">
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 font-jakarta">
                                <span className="material-symbols-outlined text-[16px]">school</span>
                                My Classes
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-jakarta">Your Enrolled Classes</h1>
                        </div>

                        {classes.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800 rounded-[24px] border border-slate-200 dark:border-slate-700/80 p-12 text-center shadow-level-1 max-w-md mx-auto my-8">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No classes yet</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Browse classes and enrol to see them here.</p>
                                <Link to="/classes" className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all">
                                    Browse Classes
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {classes.map((cls) => {
                                    const isCancelled = cls.status === 'Cancelled';
                                    return (
                                        <div key={cls.id} className={`bg-white dark:bg-slate-800 rounded-[24px] border p-6 shadow-level-1 relative overflow-hidden ${isCancelled ? 'border-slate-300 dark:border-slate-600 opacity-80' : 'border-slate-200 dark:border-slate-700/80'}`}>
                                            {isCancelled && (
                                                <div className="absolute top-0 right-0 left-0 bg-rose-50 text-rose-700 py-1 text-center text-[10px] font-bold uppercase tracking-wider border-b border-rose-200">
                                                    Cancelled
                                                </div>
                                            )}
                                            <div className={isCancelled ? 'pt-4' : ''}>
                                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">{cls.categoryName}</span>
                                                <Link to={`/student/classes/${cls.id}`} className="block text-lg font-bold text-slate-900 dark:text-white mt-3 mb-2 font-jakarta hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                                                    {cls.name}
                                                </Link>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">{cls.teacherName}</p>
                                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-slate-500">calendar_month</span>
                                                        <span>{new Date(cls.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                                    </div>
                                                </div>
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
