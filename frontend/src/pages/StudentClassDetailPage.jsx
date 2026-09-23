import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { clearSession } from '../utils/session';

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// Student's view of one class they're enrolled in: study materials to download (AA-53) and
// assignments to submit (AA-56/AA-57). A non-enrolled Student never reaches this page with a
// usable class id (ClassesPage/StudentMyClassesPage only ever link here for classes they can
// see), but the 403 the server returns either way is the real access control (AA-54), not this
// page's own routing.
export default function StudentClassDetailPage() {
    const { id } = useParams();
    const apiBase = `${import.meta.env.VITE_API_URL}/api/student/classes/${id}`;

    const [sessionEnded, setSessionEnded] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);

    const [materials, setMaterials] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [submittingId, setSubmittingId] = useState(null);
    const [submitError, setSubmitError] = useState('');

    const onUnauthorized = () => {
        clearSession();
        setSessionEnded(true);
    };

    const loadMaterials = () => {
        fetch(`${apiBase}/materials`, { headers: authHeader() }).then((res) => {
            if (res.status === 401) return onUnauthorized();
            if (res.status === 403) return setAccessDenied(true);
            if (res.ok) return res.json().then(setMaterials);
        });
    };

    const loadAssignments = () => {
        fetch(`${apiBase}/assignments`, { headers: authHeader() }).then((res) => {
            if (res.status === 401) return onUnauthorized();
            if (res.status === 403) return setAccessDenied(true);
            if (res.ok) return res.json().then(setAssignments);
        });
    };

    useEffect(() => {
        loadMaterials();
        loadAssignments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const download = async (materialId, fileName) => {
        const res = await fetch(`${apiBase}/materials/${materialId}/download`, { headers: authHeader() });
        if (res.status === 401) return onUnauthorized();
        if (!res.ok) return;
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const submit = async (assignmentId, file) => {
        if (!file) {
            setSubmitError('Choose a file to submit.');
            return;
        }
        setSubmitError('');
        setSubmittingId(assignmentId);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${apiBase}/assignments/${assignmentId}/submissions`, {
                method: 'POST',
                headers: authHeader(),
                body: formData,
            });
            if (res.status === 401) return onUnauthorized();
            if (!res.ok) {
                const body = await res.json().catch(() => null);
                setSubmitError(body?.message || 'Could not submit your work. Please try again.');
                return;
            }
            loadAssignments();
        } catch {
            setSubmitError('Server connection error. Please try again.');
        } finally {
            setSubmittingId(null);
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

    if (accessDenied) {
        return (
            <Layout>
                <section className="py-24 px-6 max-w-lg mx-auto w-full min-h-[60vh] text-center">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">You need to be enrolled in this class to view its materials and assignments.</p>
                </section>
            </Layout>
        );
    }

    return (
        <Layout>
            <section className="py-24 px-6 max-w-5xl mx-auto w-full min-h-[60vh] space-y-10">
                <div className="bg-white dark:bg-slate-800 rounded-[24px] border border-slate-200 dark:border-slate-700/80 shadow-level-1 p-8">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white font-jakarta mb-4">Study Materials</h2>
                    {materials.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No materials available yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {materials.map((m) => (
                                <li key={m.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-sm">
                                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                                        <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-500">description</span>
                                        {m.fileName}
                                    </span>
                                    <button onClick={() => download(m.id, m.fileName)} className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300">Download</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-[24px] border border-slate-200 dark:border-slate-700/80 shadow-level-1 p-8">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white font-jakarta mb-4">Assignments</h2>
                    {submitError && <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-4">{submitError}</p>}
                    {assignments.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No assignments yet.</p>
                    ) : (
                        <ul className="space-y-4">
                            {assignments.map((a) => (
                                <li key={a.id} className="px-4 py-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-slate-800 dark:text-slate-100">{a.title}</span>
                                        {a.mySubmissionStatus && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${a.mySubmissionStatus === 'Late' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'}`}>
                                                {a.mySubmissionStatus}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{a.description}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Due {new Date(a.dueAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>

                                    {!a.mySubmissionStatus && (
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                submit(a.id, e.target.elements.file.files[0]);
                                            }}
                                            className="flex items-center gap-3"
                                        >
                                            <input type="file" name="file" className="flex-1 text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200" />
                                            <button
                                                type="submit"
                                                disabled={submittingId === a.id}
                                                className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all disabled:opacity-60"
                                            >
                                                {submittingId === a.id ? 'Submitting...' : 'Submit'}
                                            </button>
                                        </form>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>
        </Layout>
    );
}
