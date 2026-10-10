import React, { useState, useEffect } from 'react';

export default function GrowthReportWidget() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    }, []);

    const fetchReport = async () => {
        if (!startDate || !endDate) return;
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(${import.meta.env.VITE_API_URL}/api/users/growth-report?startDate=&endDate=, {
                headers: { Authorization: \Bearer \\ }
            });
            if (res.ok) {
                const data = await res.json();
                setReport(data);
            } else {
                setError('Failed to fetch report');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card rounded-3xl p-8 mb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-500">monitoring</span>
                    Platform Growth Report
                </h2>
            </div>
            <div className="flex flex-wrap gap-4 items-end mb-8 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                </div>
                <button onClick={fetchReport} disabled={loading} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                    {loading ? 'Loading...' : 'Generate Report'}
                </button>
            </div>
