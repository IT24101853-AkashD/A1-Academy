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
                        <ul className="space-y-2">
                            {assignments.map((a) => (
                                <li key={a.id} className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-slate-800 dark:text-slate-100">{a.title}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">{a.submissionCount} submission(s)</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Due {new Date(a.dueAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
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
