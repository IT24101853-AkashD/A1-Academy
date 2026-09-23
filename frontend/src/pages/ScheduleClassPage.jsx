import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { clearSession } from '../utils/session';

// Teacher-facing form for AA-43 - creates a class via POST /api/teacher/classes.
export default function ScheduleClassPage() {
    const navigate = useNavigate();

    const [categories, setCategories] = useState([]);
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [capacity, setCapacity] = useState(10);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [sessionEnded, setSessionEnded] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch(`${import.meta.env.VITE_API_URL}/api/categories`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => {
                const list = Array.isArray(data) ? data : [];
                setCategories(list);
                if (list.length > 0) {
                    setCategoryId(String(list[0].id));
                }
            })
            .catch(() => setCategories([]));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (!name.trim()) {
            setErrorMessage('Class name is required.');
            return;
        }
        if (!date || !time) {
            setErrorMessage('Pick a date and time for the class.');
            return;
        }

        const scheduledAt = new Date(`${date}T${time}`);
        if (Number.isNaN(scheduledAt.getTime())) {
            setErrorMessage('That date/time is not valid.');
            return;
        }

        setIsSubmitting(true);
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/teacher/classes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: name.trim(),
                    categoryId: Number(categoryId),
                    scheduledAt: scheduledAt.toISOString(),
                    capacity: Number(capacity),
                }),
            });

            if (res.status === 401) {
                clearSession();
                setSessionEnded(true);
                return;
            }

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                setErrorMessage(body?.message || 'Could not schedule the class. Please check the form and try again.');
                return;
            }

            navigate('/teacher/classes');
        } catch {
            setErrorMessage('Server connection error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (sessionEnded) {
        return (
            <Layout>
                <section className="py-24 px-6 max-w-lg mx-auto w-full min-h-[60vh]">
                    <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-level-2 border border-slate-100 dark:border-slate-700 p-10 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] text-amber-500 dark:text-amber-400">lock_clock</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Session Ended</h2>
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400 mb-6">Please sign in again to continue.</p>
                        <a href="/" className="inline-block px-6 py-3 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors">Back to Home</a>
                    </div>
                </section>
            </Layout>
        );
    }

    return (
        <Layout>
            <section className="py-24 px-6 max-w-2xl mx-auto w-full min-h-[60vh]">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 font-jakarta">
                    <span className="material-symbols-outlined text-[16px]">event_available</span>
                    Schedule a Class
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-jakarta mb-8">Set up a new class session</h1>

                <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-[24px] border border-slate-200 dark:border-slate-700/80 shadow-level-1 p-8 space-y-5">
                    {errorMessage && (
                        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 text-sm font-semibold text-red-600 dark:text-red-400">
                            {errorMessage}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Class name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Algebra Basics"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 text-slate-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Subject</label>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                        >
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 text-slate-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Time</label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Seat capacity</label>
                        <input
                            type="number"
                            min="1"
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 text-slate-900 dark:text-white"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-60"
                    >
                        {isSubmitting ? 'Scheduling...' : 'Schedule Class'}
                    </button>
                </form>
            </section>
        </Layout>
    );
}
