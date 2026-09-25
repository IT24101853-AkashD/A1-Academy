import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { clearSession } from '../utils/session';

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// Teacher's management view for one class: study materials (AA-52, AA-84, AA-86), assignments
// (AA-55), and attendance marking (AA-62, AA-89) - combined the way the design reference
// (TeacherClassDetail) laid it out, as sections of one page rather than separate routes.
export default function TeacherClassDetailPage() {
    const { id } = useParams();
    const apiBase = `${import.meta.env.VITE_API_URL}/api/teacher/classes/${id}`;

    const [sessionEnded, setSessionEnded] = useState(false);

    // Materials
    const [materials, setMaterials] = useState([]);
    const [uploadError, setUploadError] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Assignments
    const [assignments, setAssignments] = useState([]);
    const [asgTitle, setAsgTitle] = useState('');
    const [asgDescription, setAsgDescription] = useState('');
    const [asgDate, setAsgDate] = useState('');
    const [asgTime, setAsgTime] = useState('');
    const [asgError, setAsgError] = useState('');
    const [isCreatingAsg, setIsCreatingAsg] = useState(false);
    const [expandedAsgId, setExpandedAsgId] = useState(null);
    const [submissions, setSubmissions] = useState({});
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);

    // Roster / attendance
    const [roster, setRoster] = useState([]);
    const [attendanceDraft, setAttendanceDraft] = useState({});
    const [isSavingAttendance, setIsSavingAttendance] = useState(false);
    const [attendanceSaved, setAttendanceSaved] = useState(false);

    const onUnauthorized = () => {
        clearSession();
        setSessionEnded(true);
    };

    const loadMaterials = () => {
        fetch(`${apiBase}/materials`, { headers: authHeader() })
            .then((res) => (res.status === 401 ? (onUnauthorized(), null) : res.ok ? res.json() : []))
            .then((data) => data && setMaterials(data));
    };

    const loadAssignments = () => {
        fetch(`${apiBase}/assignments`, { headers: authHeader() })
            .then((res) => (res.status === 401 ? (onUnauthorized(), null) : res.ok ? res.json() : []))
            .then((data) => data && setAssignments(data));
    };

    const loadRoster = () => {
        fetch(`${apiBase}/roster`, { headers: authHeader() })
            .then((res) => (res.status === 401 ? (onUnauthorized(), null) : res.ok ? res.json() : []))
            .then((data) => {
                if (!data) return;
                setRoster(data);
                const draft = {};
                data.forEach((s) => { draft[s.id] = s.attendanceStatus || 'Present'; });
                setAttendanceDraft(draft);
            });
    };

    useEffect(() => {
        loadMaterials();
        loadAssignments();
        loadRoster();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleUpload = async (e) => {
        e.preventDefault();
        const file = e.target.elements.file.files[0];
        if (!file) {
            setUploadError('Choose a file to upload.');
            return;
        }
        setUploadError('');
        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${apiBase}/materials`, { method: 'POST', headers: authHeader(), body: formData });
            if (res.status === 401) return onUnauthorized();
            if (!res.ok) {
                const body = await res.json().catch(() => null);
                setUploadError(body?.message || 'Could not upload that file.');
                return;
            }
            e.target.reset();
            loadMaterials();
        } catch {
            setUploadError('Server connection error. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const deleteMaterial = async (materialId) => {
        await fetch(`${apiBase}/materials/${materialId}`, { method: 'DELETE', headers: authHeader() });
        loadMaterials();
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        setAsgError('');

        if (!asgTitle.trim() || !asgDescription.trim() || !asgDate || !asgTime) {
            setAsgError('Fill in every field.');
            return;
        }

        const dueAt = new Date(`${asgDate}T${asgTime}`);
        setIsCreatingAsg(true);

        try {
            const res = await fetch(`${apiBase}/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ title: asgTitle.trim(), description: asgDescription.trim(), dueAt: dueAt.toISOString() }),
            });
            if (res.status === 401) return onUnauthorized();
            if (!res.ok) {
                const body = await res.json().catch(() => null);
                setAsgError(body?.message || 'Could not create the assignment.');
                return;
            }
            setAsgTitle('');
            setAsgDescription('');
            setAsgDate('');
            setAsgTime('');
            loadAssignments();
        } catch {
            setAsgError('Server connection error. Please try again.');
        } finally {
            setIsCreatingAsg(false);
        }
    };

    const toggleSubmissions = async (asgId) => {
        if (expandedAsgId === asgId) {
            setExpandedAsgId(null);
            return;
        }
        setExpandedAsgId(asgId);
        if (!submissions[asgId]) {
            setLoadingSubmissions(true);
            try {
                const res = await fetch(`${apiBase}/assignments/${asgId}/submissions`, { headers: authHeader() });
                if (res.status === 401) return onUnauthorized();
                if (res.ok) {
                    const data = await res.json();
                    setSubmissions((prev) => ({ ...prev, [asgId]: data }));
                }
            } catch {
                // Ignore fetch error
            } finally {
                setLoadingSubmissions(false);
            }
        }
    };

    const downloadSubmission = async (asgId, subId, fileName) => {
        try {
            const res = await fetch(`${apiBase}/assignments/${asgId}/submissions/${subId}/download`, { headers: authHeader() });
            if (res.status === 401) return onUnauthorized();
            if (!res.ok) return;
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch {
            // Ignore download error
        }
    };

    const saveAttendance = async () => {
        setIsSavingAttendance(true);
        setAttendanceSaved(false);
        try {
            const entries = roster.map((s) => ({ studentId: s.id, status: attendanceDraft[s.id] || 'Present' }));
            const res = await fetch(`${apiBase}/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ entries }),
            });
            if (res.status === 401) return onUnauthorized();
            if (res.ok) {
                setAttendanceSaved(true);
                loadRoster();
            }
        } finally {
            setIsSavingAttendance(false);
        }
    };

    if (sessionEnded) {
        return (
            <Layout>
                <section className="py-24 px-6 max-w-lg mx-auto w-full min-h-[60vh] text-center">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Session Ended</h2>
                    <a href="/" className="inline-block px-6 py-3 rounded-full bg-slate-900 text-white font-bold text-sm">Back to Home</a>
                </section>
            </Layout>
        );
    }

    return (
        <Layout>
            <section className="py-24 px-6 max-w-5xl mx-auto w-full min-h-[60vh] space-y-10">
                {/* Study Materials */}
                <div className="bg-white dark:bg-slate-800 rounded-[24px] border border-slate-200 dark:border-slate-700/80 shadow-level-1 p-8">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white font-jakarta mb-4">Study Materials</h2>

                    <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-3 mb-6">
                        <input type="file" name="file" className="flex-1 text-sm text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200" />
                        <button type="submit" disabled={isUploading} className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all disabled:opacity-60">
                            {isUploading ? 'Uploading...' : 'Upload Material'}
                        </button>
                    </form>
                    {uploadError && <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-4">{uploadError}</p>}

                    {materials.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No materials uploaded yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {materials.map((m) => (
                                <li key={m.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-sm">
                                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                                        <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-500">description</span>
                                        {m.fileName}
                                    </span>
                                    <button onClick={() => deleteMaterial(m.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Assignments */}
                <div className="bg-white dark:bg-slate-800 rounded-[24px] border border-slate-200 dark:border-slate-700/80 shadow-level-1 p-8">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white font-jakarta mb-4">Assignments</h2>

                    <form onSubmit={handleCreateAssignment} className="space-y-3 mb-6">
                        {asgError && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{asgError}</p>}
                        <input
                            type="text" placeholder="Assignment title" value={asgTitle}
                            onChange={(e) => setAsgTitle(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                        />
                        <textarea
                            placeholder="Description" value={asgDescription} rows={2}
                            onChange={(e) => setAsgDescription(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input type="date" value={asgDate} onChange={(e) => setAsgDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                            <input type="time" value={asgTime} onChange={(e) => setAsgTime(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
                        </div>
                        <button type="submit" disabled={isCreatingAsg} className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all disabled:opacity-60">
                            {isCreatingAsg ? 'Creating...' : 'Create Assignment'}
                        </button>
                    </form>

                    {assignments.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No assignments yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {assignments.map((a) => (
                                <li key={a.id} className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-slate-800 dark:text-slate-100">{a.title}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500 dark:text-slate-400">{a.submissionCount} submission(s)</span>
                                            <button
                                                type="button"
                                                onClick={() => toggleSubmissions(a.id)}
                                                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                                            >
                                                {expandedAsgId === a.id ? 'Hide Submissions' : 'View Submissions'}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Due {new Date(a.dueAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>

                                    {expandedAsgId === a.id && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/80">
                                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 font-jakarta">Student Submissions</h4>
                                            {loadingSubmissions && !submissions[a.id] ? (
                                                <p className="text-xs text-slate-400">Loading submissions...</p>
                                            ) : !submissions[a.id] || submissions[a.id].length === 0 ? (
                                                <p className="text-xs text-slate-400">No submissions received yet.</p>
                                            ) : (
                                                <ul className="space-y-2">
                                                    {submissions[a.id].map((sub) => (
                                                        <li key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-slate-900 dark:text-white">{sub.studentName}</span>
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                                        sub.status === 'Late'
                                                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                                                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                                    }`}>
                                                                        {sub.status}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                                    {sub.fileName} &bull; {sub.studentEmail} &bull; Submitted {new Date(sub.submittedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => downloadSubmission(a.id, sub.id, sub.fileName)}
                                                                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                                                            >
                                                                Download
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Attendance */}
                <div className="bg-white dark:bg-slate-800 rounded-[24px] border border-slate-200 dark:border-slate-700/80 shadow-level-1 p-8">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white font-jakarta mb-4">Attendance</h2>

                    {roster.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No students enrolled yet.</p>
                    ) : (
                        <>
                            <ul className="space-y-2 mb-6">
                                {roster.map((s) => (
                                    <li key={s.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-sm">
                                        <span className="font-medium text-slate-700 dark:text-slate-200">{s.firstName} {s.lastName}</span>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setAttendanceDraft((prev) => ({ ...prev, [s.id]: 'Present' }))}
                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${attendanceDraft[s.id] === 'Present' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                                            >
                                                Present
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAttendanceDraft((prev) => ({ ...prev, [s.id]: 'Absent' }))}
                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${attendanceDraft[s.id] === 'Absent' ? 'bg-rose-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                                            >
                                                Absent
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            {attendanceSaved && <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Attendance saved.</p>}
                            <button
                                onClick={saveAttendance}
                                disabled={isSavingAttendance}
                                className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all disabled:opacity-60"
                            >
                                {isSavingAttendance ? 'Saving...' : 'Save Attendance'}
                            </button>
                        </>
                    )}
                </div>
            </section>
        </Layout>
    );
}
