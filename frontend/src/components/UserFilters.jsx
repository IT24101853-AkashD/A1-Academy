import React from 'react';

const ROLE_OPTIONS = ['Student', 'Teacher', 'Admin'];
const STATUS_OPTIONS = ['Active', 'Pending', 'Rejected', 'Deactivated'];

export default function UserFilters({ role, status, onRoleChange, onStatusChange, onShowPendingTeachers, onClear }) {
    const hasActiveFilter = Boolean(role || status);
    const isPendingTeachersView = role === 'Teacher' && status === 'Pending';

    return (
        <div className="mb-8 flex flex-col lg:flex-row lg:items-start justify-between gap-6 p-6 rounded-[24px] bg-white dark:bg-slate-800/60 backdrop-blur-md border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex flex-col gap-6 flex-1">
                <div className="flex items-start gap-4">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2.5 w-16 flex-shrink-0">Roles</span>
                    <div className="flex flex-wrap items-center gap-2">
                        <button 
                            onClick={() => onRoleChange('')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${!role ? 'bg-slate-900 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                        >All</button>
                        {ROLE_OPTIONS.map((r) => (
                            <button
                                key={r}
                                onClick={() => onRoleChange(r)}
                                className={`px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${role === r ? 'bg-slate-900 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                            >
                                {r}s
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2.5 w-16 flex-shrink-0">Status</span>
                    <div className="flex flex-wrap items-center gap-2">
                        <button 
                            onClick={() => onStatusChange('')}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${!status ? 'bg-slate-900 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                        >All</button>
                        {STATUS_OPTIONS.map((s) => (
                            <button
                                key={s}
                                onClick={() => onStatusChange(s)}
                                className={`px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer flex items-center gap-1 ${status === s ? 'bg-slate-900 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                            >
                                {s === 'Pending' && <span className={`w-2 h-2 rounded-full ${status === s ? 'bg-amber-400' : 'bg-amber-500'}`}></span>}
                                {s === 'Active' && <span className={`w-2 h-2 rounded-full ${status === s ? 'bg-emerald-400' : 'bg-emerald-500'}`}></span>}
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={onShowPendingTeachers}
                    aria-pressed={isPendingTeachersView}
                    className={`flex items-center gap-3 px-8 py-4 rounded-full text-base font-black tracking-wide transition-all cursor-pointer shadow-md hover:shadow-lg ${isPendingTeachersView ? 'bg-amber-500 text-white shadow-amber-500/30 hover:bg-amber-600' : 'bg-white dark:bg-slate-800 border-2 border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:border-amber-400'}`}
                >
                    <span className="material-symbols-outlined text-[24px]">hourglass_top</span>
                    Pending Teachers
                </button>

                {hasActiveFilter && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                        title="Clear filters"
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                )}
            </div>
        </div>
    );
}
