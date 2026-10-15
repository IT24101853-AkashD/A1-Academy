import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { clearSession } from '../utils/session';

export default function TeacherGradeReportPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClassId = searchParams.get('classId');

    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState(queryClassId || '');
    const [report, setReport] = useState(null);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingReport, setLoadingReport] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [sessionEnded, setSessionEnded] = useState(false);

    // Fetch teacher's classes
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        fetch(`${import.meta.env.VITE_API_URL}/api/teacher/classes`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(async (res) => {
                if (res.status === 401) {
                    clearSession();
                    setSessionEnded(true);
                    return null;
                }
                if (!res.ok) throw new Error('Failed to load classes.');
                return res.json();
            })
            .then((data) => {
                if (data) {
                    const validClasses = data.filter((c) => c.status !== 'Cancelled');
                    setClasses(validClasses);
                    if (validClasses.length > 0) {
                        const targetId = queryClassId && validClasses.some((c) => c.id.toString() === queryClassId)
                            ? queryClassId
                            : validClasses[0].id.toString();
                        setSelectedClassId(targetId);
                    }
                }
            })
            .catch((err) => {
                setErrorMessage(err.message || 'Error loading classes.');
            })
            .finally(() => {
                setLoadingClasses(false);
            });
    }, [queryClassId]);

    // Fetch report whenever selectedClassId changes
    useEffect(() => {
        if (!selectedClassId) return;

        setLoadingReport(true);
        setErrorMessage('');
        const token = localStorage.getItem('token');

        fetch(`${import.meta.env.VITE_API_URL}/api/teacher/classes/${selectedClassId}/grade-distribution`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(async (res) => {
                if (res.status === 401) {
                    clearSession();
                    setSessionEnded(true);
                    return null;
                }
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.message || 'Failed to load grade report.');
                }
                return res.json();
            })
            .then((data) => {
                if (data) setReport(data);
            })
            .catch((err) => {
                setErrorMessage(err.message || 'Error loading grade distribution.');
                setReport(null);
            })
            .finally(() => {
                setLoadingReport(false);
            });
    }, [selectedClassId]);

    const handleClassChange = (e) => {
        const newId = e.target.value;
        setSelectedClassId(newId);
        setSearchParams({ classId: newId });
    };

    const getGradeBadge = (avg) => {
        if (avg >= 90) return { label: 'Excellent (A)', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' };
        if (avg >= 80) return { label: 'Good (B)', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' };
        if (avg >= 70) return { label: 'Average (C)', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
        if (avg >= 60) return { label: 'Below Average (D)', color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800' };
        return { label: 'Needs Improvement (F)', color: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800' };
    };

    const getBucketColor = (label) => {
        if (label.startsWith('A')) return 'bg-emerald-500';
        if (label.startsWith('B')) return 'bg-indigo-500';
        if (label.startsWith('C')) return 'bg-amber-500';
        if (label.startsWith('D')) return 'bg-orange-500';
        return 'bg-rose-500';
    };

    return (
        <Layout>
            <div className="w-full max-w-7xl mx-auto pt-28 pb-12 px-4 sm:px-6 lg:px-8 font-jakarta min-h-[75vh]">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                            <span className="material-symbols-outlined text-[18px]">analytics</span>
                            Class Reporting Tools
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            Teacher Grade Distribution Report
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Evaluate academic performance across all coursework and submitted assignments.
                        </p>
                    </div>

                    {/* Class Selector Dropdown */}
                    {!loadingClasses && classes.length > 0 && (
                        <div className="flex items-center gap-3 w-full lg:w-auto min-w-0 bg-white dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <label htmlFor="classSelect" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-2">
                                Class:
                            </label>
                            <select
                                id="classSelect"
                                value={selectedClassId}
                                onChange={handleClassChange}
                                className="w-0 min-w-0 flex-1 lg:w-auto lg:flex-none lg:max-w-xs truncate px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            >
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id.toString()}>
                                        {c.name} ({c.categoryName})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Session Ended state */}
                {sessionEnded && (
                    <div className="max-w-md mx-auto bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-8 border border-slate-200 dark:border-slate-700 text-center shadow-sm">
                        <span className="material-symbols-outlined text-4xl text-amber-500 mb-2">lock_clock</span>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Session Ended</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Please log in again to access class reports.</p>
                        <a href="/" className="inline-block px-5 py-2.5 rounded-full bg-slate-900 text-white font-semibold text-xs">Home</a>
                    </div>
                )}

                {/* Loading Classes */}
                {loadingClasses && (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                )}

                {/* No classes available */}
                {!loadingClasses && classes.length === 0 && !sessionEnded && (
                    <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-lg mx-auto p-5 sm:p-8 shadow-sm">
                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3 block">school</span>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Active Classes Found</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Schedule a class and assign student work to view grade analytics.</p>
                        <Link to="/teacher/classes/new" className="px-5 py-2.5 rounded-full bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors">
                            + Schedule Class
                        </Link>
                    </div>
                )}

                {/* Loading Report */}
                {loadingReport && (
                    <div className="flex justify-center py-16">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Error message */}
                {errorMessage && !loadingReport && (
                    <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-sm font-medium">
                        {errorMessage}
                    </div>
                )}

                {/* Report Content */}
                {!loadingReport && report && (
                    <div className="space-y-8">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {/* Class Average Grade Card */}
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Class Average Grade</span>
                                    <span className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center material-symbols-outlined text-xl">
                                        grade
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                                        {report.gradedSubmissionsCount > 0 ? `${report.averageGrade}%` : 'N/A'}
                                    </span>
                                </div>
                                {report.gradedSubmissionsCount > 0 && (
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getGradeBadge(report.averageGrade).color}`}>
                                        {getGradeBadge(report.averageGrade).label}
                                    </span>
                                )}
                            </div>

                            {/* Enrolled Students */}
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Class Enrollment</span>
                                    <span className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center material-symbols-outlined text-xl">
                                        group
                                    </span>
                                </div>
                                <p className="text-4xl font-extrabold text-slate-900 dark:text-white mb-1">{report.enrolledCount}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Active enrolled students</p>
                            </div>

                            {/* Total Assignments */}
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Assignments</span>
                                    <span className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center material-symbols-outlined text-xl">
                                        assignment
                                    </span>
                                </div>
                                <p className="text-4xl font-extrabold text-slate-900 dark:text-white mb-1">{report.totalAssignments}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Coursework assignments</p>
                            </div>

                            {/* Graded Submissions */}
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Graded Work</span>
                                    <span className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center material-symbols-outlined text-xl">
                                        check_circle
                                    </span>
                                </div>
                                <p className="text-4xl font-extrabold text-slate-900 dark:text-white mb-1">
                                    {report.gradedSubmissionsCount} <span className="text-lg font-semibold text-slate-400">/ {report.totalSubmissions}</span>
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {report.totalSubmissions > 0
                                        ? `${Math.round((report.gradedSubmissionsCount / report.totalSubmissions) * 100)}% submissions evaluated`
                                        : 'No submissions yet'}
                                </p>
                            </div>
                        </div>

                        {/* Grade Distribution Section */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Score Distribution</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Breakdown of grades across all submitted and evaluated coursework.
                                    </p>
                                </div>
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 self-start sm:self-auto">
                                    {report.gradedSubmissionsCount} Total Grades
                                </span>
                            </div>

                            {report.gradedSubmissionsCount === 0 ? (
                                <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2 block">bar_chart</span>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Graded Submissions Yet</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Grade submitted student assignments in this class to generate the distribution graph.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {report.distribution.map((bucket) => (
                                        <div key={bucket.label} className="space-y-1.5">
                                            <div className="flex justify-between items-center text-xs font-semibold">
                                                <span className="text-slate-800 dark:text-slate-200">{bucket.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-500 dark:text-slate-400">{bucket.count} submissions</span>
                                                    <span className="font-bold text-slate-900 dark:text-white w-12 text-right">{bucket.percentage}%</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3.5 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${getBucketColor(bucket.label)}`}
                                                    style={{ width: `${bucket.percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Per-Assignment Breakdown Table */}
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Per-Assignment Academic Breakdown</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                                Individual assignment performance metrics and score ranges.
                            </p>

                            {report.assignments.length === 0 ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400 italic">No assignments created for this class yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                <th className="py-3 px-4">Assignment</th>
                                                <th className="py-3 px-4">Due Date</th>
                                                <th className="py-3 px-4">Submissions</th>
                                                <th className="py-3 px-4">Average Score</th>
                                                <th className="py-3 px-4">Score Range</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                            {report.assignments.map((a) => (
                                                <tr key={a.assignmentId} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">{a.title}</td>
                                                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                                                        {new Date(a.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                                                        {a.gradedCount} graded ({a.submissionsCount} total)
                                                    </td>
                                                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                                                        {a.averageGrade !== null ? `${a.averageGrade}%` : <span className="text-xs font-normal text-slate-400 italic">Not graded</span>}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                                                        {a.minGrade !== null && a.maxGrade !== null ? `${a.minGrade}% – ${a.maxGrade}%` : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
