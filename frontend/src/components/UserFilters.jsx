import React from 'react';

const ROLE_OPTIONS = ['Student', 'Teacher', 'Admin'];
const STATUS_OPTIONS = ['Active', 'Pending'];

export default function UserFilters({ role, status, onRoleChange, onStatusChange, onShowPendingTeachers, onClear }) {
    const hasActiveFilter = Boolean(role || status);
    const isPendingTeachersView = role === 'Teacher' && status === 'Pending';

    return (
        <div className="mb-6 flex flex-wrap items-center gap-3">
            <select
                aria-label="Filter by role"
                value={role}
                onChange={(e) => onRoleChange(e.target.value)}
                className="bg-white border border-slate-200 rounded-full px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-amber-500 cursor-pointer"
            >
                <option value="">All Roles</option>
                {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                ))}
            </select>

            <select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => onStatusChange(e.target.value)}
                className="bg-white border border-slate-200 rounded-full px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-amber-500 cursor-pointer"
            >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>

            <button
                type="button"
                onClick={onShowPendingTeachers}
                aria-pressed={isPendingTeachersView}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-colors cursor-pointer ${
                    isPendingTeachersView
                        ? 'bg-amber-300 border-amber-300 text-slate-900'
                        : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                }`}
            >
                <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                Pending Teacher Applications
            </button>

            {hasActiveFilter && (
                <button
                    type="button"
                    onClick={onClear}
                    className="text-sm font-bold text-slate-500 hover:text-slate-900 underline underline-offset-2 cursor-pointer"
                >
                    Clear filters
                </button>
            )}
        </div>
    );
}
