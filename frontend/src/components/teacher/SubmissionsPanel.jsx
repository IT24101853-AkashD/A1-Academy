import React, { useEffect, useMemo, useRef, useState } from 'react';

// One row per enrolled student (plus anyone who submitted but has since left the class), so a
// Teacher sees at a glance who handed in what - and who hasn't - instead of a long list of
// submissions only. Filters and search keep it usable for a class of 100.
const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'toGrade', label: 'To grade' },
    { key: 'graded', label: 'Graded' },
    { key: 'late', label: 'Submitted late' },
    { key: 'missing', label: 'Missing' },
];

const isGraded = (sub) => sub && sub.grade !== null && sub.grade !== undefined;

const matchesFilter = (row, filter) => {
    switch (filter) {
        case 'toGrade': return row.sub && !isGraded(row.sub);
        case 'graded': return isGraded(row.sub);
        case 'late': return row.sub?.status === 'Late';
        case 'missing': return !row.sub;
        default: return true;
    }
};

function StatusBadge({ sub }) {
    if (!sub) {
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Missing</span>;
    }
    const late = sub.status === 'Late';
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${late ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
            {sub.status}
        </span>
    );
}

export default function SubmissionsPanel({ submissions, roster, onDownload, onSaveGrade }) {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [gradingId, setGradingId] = useState(null);
    const scoreInputRef = useRef(null);

    // Move focus to the score box only when the teacher opens a grading form (or Save & next
    // opens the next one), not on every render as the autoFocus attribute would.
    useEffect(() => {
        if (gradingId !== null) scoreInputRef.current?.focus();
    }, [gradingId]);
    const [gradeInput, setGradeInput] = useState('');
    const [feedbackInput, setFeedbackInput] = useState('');
    const [gradeError, setGradeError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const rows = useMemo(() => {
        const byStudent = new Map(submissions.map((s) => [s.studentId, s]));
        const enrolled = roster.map((st) => ({
            key: `st-${st.id}`,
            name: `${st.firstName} ${st.lastName}`.trim(),
            email: st.email,
            sub: byStudent.get(st.id) || null,
        }));
        const enrolledIds = new Set(roster.map((st) => st.id));
        const others = submissions
            .filter((s) => !enrolledIds.has(s.studentId))
            .map((s) => ({ key: `sub-${s.id}`, name: s.studentName, email: s.studentEmail, sub: s }));
        return [...enrolled, ...others].sort((a, b) => a.name.localeCompare(b.name));
    }, [submissions, roster]);

    const counts = useMemo(() => {
        const c = { all: rows.length };
        for (const f of FILTERS.slice(1)) c[f.key] = rows.filter((r) => matchesFilter(r, f.key)).length;
        return c;
    }, [rows]);

    const term = search.trim().toLowerCase();
    const visible = rows.filter((r) => matchesFilter(r, filter)
        && (!term || r.name.toLowerCase().includes(term) || (r.email || '').toLowerCase().includes(term)));

    const startGrading = (sub) => {
        setGradingId(sub.id);
        setGradeInput(isGraded(sub) ? String(sub.grade) : '');
        setFeedbackInput(sub.feedback || '');
        setGradeError('');
    };

    const save = async (sub, goNext) => {
        const grade = Number.parseInt(gradeInput, 10);
        if (Number.isNaN(grade) || grade < 0 || grade > 100) {
            setGradeError('Grade must be between 0 and 100.');
            return;
        }
        setIsSaving(true);
        setGradeError('');
        const error = await onSaveGrade(sub, grade, feedbackInput);
        setIsSaving(false);
        if (error) {
            setGradeError(error);
            return;
        }
        // "Save & next" jumps to the next ungraded submission in the current view.
        const idx = visible.findIndex((r) => r.sub?.id === sub.id);
        const next = goNext ? visible.slice(idx + 1).find((r) => r.sub && !isGraded(r.sub)) : null;
        if (next) startGrading(next.sub);
        else setGradingId(null);
    };

    const submittedCount = rows.filter((r) => r.sub).length;

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-jakarta">Student Submissions</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{submittedCount}</span> of {rows.length} submitted
                    {' · '}<span className="font-bold text-slate-800 dark:text-slate-100">{counts.graded}</span> graded
                </p>
            </div>

            {rows.length > 0 && (
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-4 flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${(counts.graded / rows.length) * 100}%` }} title="Graded"></div>
                    <div className="h-full bg-amber-400" style={{ width: `${(counts.toGrade / rows.length) * 100}%` }} title="To grade"></div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter submissions">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => setFilter(f.key)}
                            aria-pressed={filter === f.key}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${filter === f.key ? 'bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-900' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            {f.label} <span className="opacity-70 tabular-nums">({counts[f.key]})</span>
                        </button>
                    ))}
                </div>
                <div className="relative md:ml-auto md:w-56">
                    <span className="material-symbols-outlined text-[16px] absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">search</span>
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search student"
                        aria-label="Search submissions by student"
                        className="w-full pl-9 pr-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {rows.length === 0 ? (
                <p className="text-xs text-slate-400">No students enrolled and no submissions received yet.</p>
            ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                    <div className="hidden md:grid grid-cols-[minmax(0,1.6fr)_minmax(0,1.6fr)_6rem_5rem_9.5rem] gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-900/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <span>Student</span><span>Submission</span><span>Status</span><span>Grade</span><span className="text-right">Actions</span>
                    </div>
                    <ul className="max-h-[28rem] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/70">
                        {visible.length === 0 && (
                            <li className="px-4 py-6 text-center text-xs text-slate-400">No students match this filter.</li>
                        )}
                        {visible.map((row) => {
                            const { sub } = row;
                            return (
                                <li key={row.key} className="px-4 py-3 text-xs">
                                    <div className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.6fr)_6rem_5rem_9.5rem] gap-x-3 gap-y-1.5 md:items-center">
                                        <div className="min-w-0 order-1">
                                            <p className="font-semibold text-slate-900 dark:text-white truncate">{row.name}</p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{row.email}</p>
                                        </div>
                                        {/* Rendered once; order moves it beside the name on phones and into its column on desktop. */}
                                        <div className="order-2 md:order-3 justify-self-end md:justify-self-start"><StatusBadge sub={sub} /></div>
                                        <div className="min-w-0 col-span-2 md:col-span-1 order-3 md:order-2">
                                            {sub ? (
                                                <>
                                                    <p className="text-slate-700 dark:text-slate-200 truncate" title={sub.fileName}>{sub.fileName}</p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        {new Date(sub.submittedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-slate-400 italic">Not submitted</p>
                                            )}
                                        </div>
                                        <div className="order-4 self-center text-slate-700 dark:text-slate-200">
                                            {isGraded(sub) ? <span className="font-bold">{sub.grade}/100</span> : sub ? <span className="text-amber-600 dark:text-amber-400 font-semibold">To grade</span> : <span className="text-slate-400">—</span>}
                                        </div>
                                        <div className="order-5 flex gap-2 justify-end">
                                            {sub && gradingId !== sub.id && (
                                                <button
                                                    type="button"
                                                    onClick={() => startGrading(sub)}
                                                    className="px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 font-semibold text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                                                >
                                                    {isGraded(sub) ? 'Edit' : 'Grade'}
                                                </button>
                                            )}
                                            {sub && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDownload(sub)}
                                                    title={`Download ${sub.fileName}`}
                                                    aria-label={`Download ${row.name}'s submission`}
                                                    className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">download</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {sub?.feedback && gradingId !== sub.id && (
                                        <p className="mt-2 text-slate-600 dark:text-slate-300 italic border-l-2 border-indigo-200 dark:border-indigo-800 pl-2">"{sub.feedback}"</p>
                                    )}

                                    {sub && gradingId === sub.id && (
                                        <form
                                            className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap gap-3 items-end"
                                            onSubmit={(e) => { e.preventDefault(); void save(sub, true); }}
                                        >
                                            <div className="w-24">
                                                <label htmlFor={`grade-score-${sub.id}`} className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Score (0-100)</label>
                                                <input
                                                    id={`grade-score-${sub.id}`}
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    ref={scoreInputRef}
                                                    value={gradeInput}
                                                    onChange={(e) => setGradeInput(e.target.value)}
                                                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-[160px]">
                                                <label htmlFor={`grade-feedback-${sub.id}`} className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Feedback (Optional)</label>
                                                <input
                                                    id={`grade-feedback-${sub.id}`}
                                                    type="text"
                                                    value={feedbackInput}
                                                    onChange={(e) => setFeedbackInput(e.target.value)}
                                                    placeholder="Great job..."
                                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button type="button" onClick={() => setGradingId(null)} disabled={isSaving} className="px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold cursor-pointer">
                                                    Cancel
                                                </button>
                                                <button type="button" onClick={() => void save(sub, false)} disabled={isSaving} className="px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 font-semibold disabled:opacity-50 cursor-pointer">
                                                    Save
                                                </button>
                                                <button type="submit" disabled={isSaving} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 cursor-pointer">
                                                    {isSaving ? 'Saving...' : 'Save & next'}
                                                </button>
                                            </div>
                                            {gradeError && <p className="w-full text-rose-600 dark:text-rose-400 font-semibold">{gradeError}</p>}
                                        </form>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
