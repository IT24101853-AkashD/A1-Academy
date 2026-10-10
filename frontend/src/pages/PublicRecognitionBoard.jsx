import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';

export default function PublicRecognitionBoard() {
    const [badges, setBadges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void fetchBadges();
    }, []);

    const fetchBadges = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/recognition/board`);
            if (res.ok) {
                const data = await res.json();
                setBadges(data);
            }
        } catch (error) {
            console.error('Error fetching recognition board', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4 font-jakarta">Public Recognition Board</h1>
                    <p className="text-xl text-slate-600 dark:text-slate-400">Celebrating the outstanding achievements of our students.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                ) : badges.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4 block">military_tech</span>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No badges awarded yet</h3>
                        <p className="text-slate-500 dark:text-slate-400">When teachers award badges, they will appear here.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {badges.map(badge => (
                            <div key={badge.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all">
                                <div className="absolute top-0 right-0 w-24 h-24 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
                                    <span className="material-symbols-outlined text-9xl" style={{ color: badge.badgeColor || '#6366f1' }}>{badge.badgeIcon || 'military_tech'}</span>
                                </div>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner" style={{ backgroundColor: `${badge.badgeColor || '#6366f1'}20`, color: badge.badgeColor || '#6366f1' }}>
                                        <span className="material-symbols-outlined text-3xl">{badge.badgeIcon || 'military_tech'}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white font-jakarta">{badge.badgeName}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(badge.awardedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{badge.studentName}</p>
                                </div>
                                {badge.comments && (
                                    <div className="mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                        <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{badge.comments}"</p>
                                    </div>
                                )}
                                <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm">school</span>
                                    Awarded by {badge.teacherName}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
