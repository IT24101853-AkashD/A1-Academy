import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { clearSession } from '../utils/session';

// Shape returned by GET /api/student/classes: an array of { id, name, categoryId, categoryName,
// teacherId, teacherName, scheduledAt, capacity, enrolledCount, status, isEnrolled }.
export default function ClassesPage() {
    const [searchParams] = useSearchParams();
    const initialCategoryId = searchParams.get('categoryId') || 'all';

    const [viewState, setViewState] = useState('idle'); // idle | loading | success | sessionEnded | error
    const [errorMessage, setErrorMessage] = useState('');
    const [classes, setClasses] = useState([]);
    const [categories, setCategories] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);

    const [enrollingId, setEnrollingId] = useState(null);
    const [enrollError, setEnrollError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');

        fetch(`${import.meta.env.VITE_API_URL}/api/categories`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => setCategories(Array.isArray(data) ? data : []))
            .catch(() => setCategories([]));
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        setViewState('loading');

        const query = selectedCategoryId !== 'all' ? `?categoryId=${selectedCategoryId}` : '';

        fetch(`${import.meta.env.VITE_API_URL}/api/student/classes${query}`, {
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
    }, [selectedCategoryId]);

    // Live text search over teacher name / subject, applied client-side on top of the
    // category-filtered set the server already returned.
    const filteredClasses = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return classes;
        return classes.filter(
            (c) =>
                c.teacherName?.toLowerCase().includes(q) ||
                c.categoryName?.toLowerCase().includes(q)
        );
    }, [classes, searchQuery]);

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategoryId('all');
    };

    const enrol = async (classId) => {
        setEnrollError('');
        setEnrollingId(classId);
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/student/classes/${classId}/enroll`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401) {
                clearSession();
                setViewState('sessionEnded');
                return;
            }
            if (res.status === 409) {
                setEnrollError('This class just filled up - please pick another one.');
                setClasses((prev) => prev.map((c) => (c.id === classId ? { ...c, enrolledCount: c.capacity } : c)));
                return;
            }
            if (!res.ok) {
                setEnrollError('Could not complete enrolment. Please try again.');
                return;
            }

            setClasses((prev) =>
                prev.map((c) =>
                    c.id === classId ? { ...c, isEnrolled: true, enrolledCount: c.enrolledCount + 1 } : c
                )
            );
        } catch {
            setEnrollError('Server connection error. Please try again.');
        } finally {
            setEnrollingId(null);
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
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400 mb-6">
                            You've been signed out - this can happen if your account's status changed. Please sign in again to continue.
                        </p>
                        <a href="/" className="inline-block px-6 py-3 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors">
                            Back to Home
                        </a>
                    </div>
                )}

                {viewState === 'loading' && classes.length === 0 && (
                    <div className="text-center py-20">
                        <span className="material-symbols-outlined text-[40px] text-slate-400 dark:text-slate-500 animate-spin">progress_activity</span>
                    </div>
                )}

                {viewState === 'error' && (
                    <div className="max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-[24px] shadow-level-2 border border-slate-100 dark:border-slate-700 p-10 text-center">
                        <p className="text-base font-bold text-red-500 dark:text-red-400">{errorMessage}</p>
                        <Link to="/student/categories" className="inline-block mt-6 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                            &larr; Back to Categories
                        </Link>
                    </div>
                )}

                {(viewState === 'success' || (viewState === 'loading' && classes.length > 0)) && (
                    <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                            <div>
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 font-jakarta">
                                    <span className="material-symbols-outlined text-[16px]">school</span>
                                    Live Class Schedules
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-jakarta">Browse &amp; Search Classes</h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Discover upcoming classes, check remaining seats, and enrol directly.
                                </p>
                            </div>
                        </div>

                        {enrollError && (
                            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 text-sm font-semibold text-red-600 dark:text-red-400">
                                {enrollError}
                            </div>
                        )}

                        <div className="bg-white dark:bg-slate-800 rounded-[24px] border border-slate-200 dark:border-slate-700/80 p-5 shadow-level-1 mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 relative">
                                    <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2">search</span>
                                    <input
                                        type="text"
                                        placeholder="Search by teacher name or subject..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 text-slate-900 dark:text-white"
                                    />
                                </div>

                                <select
                                    value={selectedCategoryId}
                                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 text-slate-900 dark:text-white bg-white dark:bg-slate-800 font-medium"
                                >
                                    <option value="all">All Subjects &amp; Categories</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {(searchQuery || selectedCategoryId !== 'all') && (
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                    <span>
                                        Showing {filteredClasses.length} matching {filteredClasses.length === 1 ? 'class' : 'classes'}
                                    </span>
                                    <button onClick={clearFilters} className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold">
                                        Clear filters
                                    </button>
                                </div>
                            )}
                        </div>

                        {filteredClasses.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800 rounded-[24px] border border-slate-200 dark:border-slate-700/80 p-12 text-center shadow-level-1 max-w-md mx-auto my-8">
                                <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-[28px]">inbox</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Classes Found</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                                    We couldn't find any scheduled classes matching your search. Try adjusting your filters.
                                </p>
                                <button onClick={clearFilters} className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all">
                                    Reset Filters
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredClasses.map((cls) => {
                                    const seatsRemaining = Math.max(0, cls.capacity - cls.enrolledCount);
                                    const isFull = seatsRemaining === 0;
                                    const isCancelled = cls.status === 'Cancelled';

                                    return (
                                        <div
                                            key={cls.id}
                                            className={`bg-white dark:bg-slate-800 rounded-[24px] border transition-all p-6 shadow-level-1 hover:shadow-level-2 flex flex-col justify-between relative overflow-hidden ${
                                                isCancelled ? 'border-slate-300 dark:border-slate-600 opacity-80' : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-400'
                                            }`}
                                        >
                                            {isCancelled && (
                                                <div className="absolute top-0 right-0 left-0 bg-rose-50 text-rose-700 py-1 text-center text-[10px] font-bold uppercase tracking-wider border-b border-rose-200">
                                                    Class Cancelled
                                                </div>
                                            )}

                                            <div className={isCancelled ? 'pt-4' : ''}>
                                                <div className="flex items-center justify-between gap-2 mb-3">
                                                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                                        {cls.categoryName}
                                                    </span>
                                                    {isCancelled ? (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 uppercase">Cancelled</span>
                                                    ) : cls.isEnrolled ? (
                                                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[12px]">check_circle</span> Enrolled
                                                        </span>
                                                    ) : isFull ? (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 dark:text-slate-300">Class Full</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-900">
                                                            {seatsRemaining} / {cls.capacity} seats left
                                                        </span>
                                                    )}
                                                </div>

                                                {cls.isEnrolled ? (
                                                    <Link
                                                        to={`/student/classes/${cls.id}`}
                                                        className="block text-lg font-bold text-slate-900 dark:text-white mb-2 font-jakarta hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                                    >
                                                        {cls.name}
                                                    </Link>
                                                ) : (
                                                    <h3 className="block text-lg font-bold text-slate-900 dark:text-white mb-2 font-jakarta">
                                                        {cls.name}
                                                    </h3>
                                                )}

                                                <div className="flex items-center gap-2.5 mb-4 text-xs text-slate-600 dark:text-slate-300">
                                                    <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-[11px]">
                                                        {cls.teacherName?.[0] || 'T'}
                                                    </div>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-100">{cls.teacherName}</span>
                                                </div>

                                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 mb-5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-slate-500">calendar_month</span>
                                                        <span>{new Date(cls.scheduledAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-slate-500">schedule</span>
                                                        <span>{new Date(cls.scheduledAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                                {isCancelled ? (
                                                    <button disabled className="w-full py-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 text-xs font-medium cursor-not-allowed">
                                                        Cancelled
                                                    </button>
                                                ) : cls.isEnrolled ? (
                                                    <button disabled className="w-full py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 flex items-center justify-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">check_circle</span> Enrolled
                                                    </button>
                                                ) : isFull ? (
                                                    <button disabled className="w-full py-2 rounded-full bg-slate-200 text-slate-400 dark:text-slate-500 text-xs font-semibold cursor-not-allowed">
                                                        Class Full
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => enrol(cls.id)}
                                                        disabled={enrollingId === cls.id}
                                                        className="w-full py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-60"
                                                    >
                                                        {enrollingId === cls.id ? 'Enrolling...' : 'Enrol Now'}
                                                    </button>
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
