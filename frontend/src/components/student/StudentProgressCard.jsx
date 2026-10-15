import React, { useState, useEffect } from 'react';
import { clearSession } from '../../utils/session';

export default function StudentProgressCard() {
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        fetch(`${import.meta.env.VITE_API_URL}/api/student/classes/my-progress`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(async (res) => {
                if (res.status === 401) {
                    clearSession();
                    return null;
                }
                if (!res.ok) {
                    throw new Error('Failed to load progress data.');
                }
                return res.json();
            })
            .then((data) => {
                if (data && typeof data === 'object' && !Array.isArray(data)) {
                    setProgress(data);
                }
            })
            .catch((err) => {
                setError(err.message || 'Error loading your progress card.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-8 shadow-level-1 mb-8">
                <div className="flex items-center justify-center py-6">
                    <span className="material-symbols-outlined text-3xl text-indigo-500 animate-spin">progress_activity</span>
                    <span className="ml-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Loading your progress card...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 text-xs font-semibold text-rose-700 dark:text-rose-300 mb-8">
                {error}
            </div>
        );
    }

    if (!progress) return null;

    const getAttendanceStatus = (pct, total) => {
        if (total === 0) return { label: 'No Sessions Marked', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' };
        if (pct >= 90) return { label: 'Excellent Attendance', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' };
        if (pct >= 75) return { label: 'Good Standing', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' };
        return { label: 'Attendance Alert', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' };
    };

    const getGradeBadge = (avg, count) => {
        if (count === 0) return { label: 'Awaiting Evaluation', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' };
        if (avg >= 90) return { label: 'Grade A - Outstanding', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' };
        if (avg >= 80) return { label: 'Grade B - Commendable', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' };
        if (avg >= 70) return { label: 'Grade C - Satisfactory', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' };
        if (avg >= 60) return { label: 'Grade D - Passing', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' };
        return { label: 'Needs Improvement', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' };
    };

    const attStatus = getAttendanceStatus(progress.overallAttendancePercentage, progress.totalAttendanceRecords);
    const gradeBadge = getGradeBadge(progress.overallAverageGrade, progress.gradedSubmissionsCount);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-8 shadow-level-1 mb-8 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1 font-jakarta">
                        <span className="material-symbols-outlined text-[16px]">id_card</span>
                        Academic Standing
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-jakarta">
                        Personalized Progress Card
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Your real-time attendance and academic average across all {progress.enrolledClassesCount} enrolled classes.
                    </p>
                </div>
                <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 self-start sm:self-auto">
                    Student ID #{progress.studentId}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Attendance Spotlight Card */}
                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/60 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Overall Attendance
                            </span>
                            <span className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center material-symbols-outlined text-lg">
                                event_available
                            </span>
                        </div>
                        <div className="flex items-baseline gap-3 mb-2">
                            <span className="text-4xl font-extrabold text-slate-900 dark:text-white font-jakarta">
                                {progress.totalAttendanceRecords > 0 ? `${progress.overallAttendancePercentage}%` : 'N/A'}
                            </span>
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${attStatus.color}`}>
                                {attStatus.label}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60">
                        {progress.totalAttendanceRecords > 0 ? (
                            <>Present in <strong className="text-slate-800 dark:text-slate-200">{progress.presentAttendanceRecords}</strong> of <strong className="text-slate-800 dark:text-slate-200">{progress.totalAttendanceRecords}</strong> class sessions recorded by your teachers.</>
                        ) : (
                            'No attendance sessions have been marked by your teachers yet.'
                        )}
                    </p>
                </div>

                {/* Grade Spotlight Card */}
                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/60 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Overall Average Grade
                            </span>
                            <span className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center material-symbols-outlined text-lg">
                                military_tech
                            </span>
                        </div>
                        <div className="flex items-baseline gap-3 mb-2">
                            <span className="text-4xl font-extrabold text-slate-900 dark:text-white font-jakarta">
                                {progress.gradedSubmissionsCount > 0 ? `${progress.overallAverageGrade}%` : 'N/A'}
                            </span>
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${gradeBadge.color}`}>
                                {gradeBadge.label}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60">
                        {progress.gradedSubmissionsCount > 0 ? (
                            <>Calculated across <strong className="text-slate-800 dark:text-slate-200">{progress.gradedSubmissionsCount}</strong> graded coursework assignments ({progress.totalSubmissionsCount} total submitted).</>
                        ) : (
                            'Submit coursework assignments to have your grades recorded.'
                        )}
                    </p>
                </div>
            </div>

            {/* Per-Class Progress Mini Roster */}
            {progress.classDetails && progress.classDetails.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/60">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 font-jakarta">
                        Class-by-Class Performance
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {progress.classDetails.map((cls) => (
                            <div key={cls.classId} className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs">
                                <div className="font-bold text-slate-900 dark:text-white mb-1 truncate" title={cls.className}>
                                    {cls.className}
                                </div>
                                <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                                    <span>Attendance:</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                                        {cls.attendancePercentage !== null ? `${cls.attendancePercentage}%` : '—'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                                    <span>Average Grade:</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                                        {cls.averageGrade !== null ? `${cls.averageGrade}%` : 'Not graded'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
