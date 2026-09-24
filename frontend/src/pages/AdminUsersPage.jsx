import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import UserFilters from '../components/UserFilters';
import { clearSession } from '../utils/session';

const STATUS_STYLES = {
    Active: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200',
    Pending: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200',
    Rejected: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200',
    Deactivated: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

const ROLE_STYLES = {
    Student: 'text-sky-600 bg-sky-50',
    Teacher: 'text-violet-600 bg-violet-50',
    Admin: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30',
};

// What the account status API errors would call "not a valid action from here" messages, kept
// friendly per action instead of surfacing the raw status code to whoever's clicking the button.
const ACTION_ERROR_MESSAGES = {
    approve: 'Could not approve this teacher. Please try again.',
    reject: 'Could not reject this application. Please try again.',
    deactivate: 'Could not deactivate this account. Please try again.',
    reactivate: 'Could not reactivate this account. Please try again.',
    delete: 'Could not delete this account. Please try again.',
};

const PAGE_SIZE = 10;

// The JWT's own payload already carries the caller's email (see AuthController.Login, which
// puts ClaimTypes.Email on every token) - decoded client-side here rather than fetched from
// /api/auth/me, purely so "whose row is this admin's own" doesn't cost a second network request.
// Never trusted for anything security-sensitive; the server independently rejects a self-action
// regardless of what this returns.
function getEmailFromToken(token) {
    if (!token) return null;
    try {
        const payloadSegment = token.split('.')[1];
        if (!payloadSegment) return null;
        const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const claims = JSON.parse(atob(padded));
        return claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || claims.email || null;
    } catch {
        return null;
    }
}

export default function AdminUsersPage() {
    // Client-side gate is a UX nicety only - GET /api/users is protected server-side by
    // [Authorize(Roles = "Admin")], so a Student/Teacher (or a tampered localStorage value)
    // gets a real 403 from the API regardless of what this component decides to render.
    const [role] = useState(() => localStorage.getItem('role'));
    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [viewState, setViewState] = useState('idle'); // idle | loading | success | denied | sessionEnded | error
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    // Tracks which row has an account-action (approve/reject/deactivate/reactivate) mid-request,
    // so we can disable just that one button instead of freezing the whole table.
    const [pendingActionId, setPendingActionId] = useState(null);
    const [actionError, setActionError] = useState('');
    // Whose row is "you" - read straight out of the JWT already sitting in localStorage (see
    // getEmailFromToken below) rather than a separate /api/auth/me round trip, so this doesn't
    // add another fetch for the directory-loading effect below to race against. Purely a UX
    // nicety: the Deactivate button just won't be offered on the signed-in Admin's own row. The
    // API rejects a self-deactivate either way (see UsersController), so a token that fails to
    // decode - or simply isn't a real JWT - just leaves every row's button showing as normal.
    const [currentUserEmail] = useState(() => getEmailFromToken(localStorage.getItem('token')));
    // Which row is mid-delete-confirmation, tracked by id the same one-at-a-time way as
    // pendingActionId above - delete is permanent (unlike the status transitions, which are all
    // at least nominally reversible), so it gets its own explicit confirm step before the
    // request goes out at all.
    const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

    useEffect(() => {
        if (role !== 'Admin') {
            setViewState('denied');
            return;
        }

        const token = localStorage.getItem('token');
        setViewState('loading');

        const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
        if (roleFilter) params.set('role', roleFilter);
        if (statusFilter) params.set('status', statusFilter);

        fetch(`${import.meta.env.VITE_API_URL}/api/users?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
                if (res.status === 401) {
                    clearSession();
                    setViewState('sessionEnded');
                    return null;
                }
                if (res.status === 403) {
                    setViewState('denied');
                    return null;
                }
                if (!res.ok) {
                    throw new Error(`Request failed with status ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                if (data) {
                    setUsers(data.items ?? []);
                    setTotalPages(data.totalPages ?? 0);
                    setTotalCount(data.totalCount ?? 0);
                    setViewState('success');
                }
            })
            .catch((err) => {
                setErrorMessage(err.message || 'Server connection error.');
                setViewState('error');
            });
    }, [role, page, roleFilter, statusFilter]);

    // Any filter change invalidates the current page number - jumping straight to a filtered
    // set's page 4 when it might only have 1 page now would just show an empty table.
    const applyRoleFilter = (value) => {
        setPage(1);
        setRoleFilter(value);
    };

    const applyStatusFilter = (value) => {
        setPage(1);
        setStatusFilter(value);
    };

    const showPendingTeachers = () => {
        setPage(1);
        setRoleFilter('Teacher');
        setStatusFilter('Pending');
    };

    const clearFilters = () => {
        setPage(1);
        setRoleFilter('');
        setStatusFilter('');
    };

    const runAccountAction = async (user, action) => {
        setPendingActionId(user.id);
        setActionError('');
        try {
            const token = localStorage.getItem('token');
            const isDelete = action === 'delete';
            const endpoint = isDelete 
                ? `${import.meta.env.VITE_API_URL}/api/users/${user.id}` 
                : `${import.meta.env.VITE_API_URL}/api/users/${user.id}/${action}`;
            
            const res = await fetch(endpoint, {
                method: isDelete ? 'DELETE' : 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Action failed');

            if (isDelete) {
                setUsers((current) => current.filter((u) => u.id !== user.id));
                setTotalCount((count) => Math.max(count - 1, 0));
            } else {
                const updated = await res.json();
                const dropsOutOfView = Boolean(statusFilter) && updated.status !== statusFilter;

                setUsers((current) =>
                    dropsOutOfView
                        ? current.filter((u) => u.id !== user.id)
                        : current.map((u) => (u.id === user.id ? updated : u))
                );
                if (dropsOutOfView) {
                    setTotalCount((count) => Math.max(count - 1, 0));
                }
            }
        } catch {
            setActionError(ACTION_ERROR_MESSAGES[action] || 'That action could not be completed. Please try again.');
        } finally {
            setPendingActionId(null);
        }
    };

    // Permanently removes a Student or Teacher account - separate from runAccountAction above
    // since this hits DELETE, not PATCH, and drops the row outright rather than updating it in
    // place with whatever the response body comes back as (there isn't one - 204 No Content).
    const deleteUser = async (user) => {
        setPendingActionId(user.id);
        setActionError('');
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/${user.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401) {
                clearSession();
                setViewState('sessionEnded');
                return;
            }

            if (!res.ok) {
                throw new Error(`delete failed with status ${res.status}`);
            }

            setUsers((current) => current.filter((u) => u.id !== user.id));
            setTotalCount((count) => Math.max(count - 1, 0));
            setConfirmingDeleteId(null);
        } catch {
            setActionError(ACTION_ERROR_MESSAGES.delete);
            setConfirmingDeleteId(null);
        } finally {
            setPendingActionId(null);
        }
    };

    return (
        <Layout>
            <div className="fixed inset-0 z-[-1] gradient-bg font-jakarta"></div>

            <section className="py-24 px-6 max-w-7xl mx-auto w-full min-h-[70vh] font-jakarta">
                <div data-aos="fade-up" className="mb-10 text-center">
                    <div className="inline-flex items-center gap-2 mb-4 px-5 py-2 rounded-full bg-white dark:bg-slate-800/60 backdrop-blur-md text-slate-600 dark:text-slate-300 text-sm font-bold tracking-widest uppercase shadow-sm border border-slate-200 dark:border-slate-700">
                        <span className="material-symbols-outlined text-sm text-blue-500 dark:text-blue-400">admin_panel_settings</span>
                        Administrator
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-3 tracking-tight gradient-text pb-2">User Directory</h1>
                    <p className="text-lg font-medium text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">Manage students, teachers, and administrators across the platform.</p>
                </div>

                {viewState === 'denied' && (
                    <div className="max-w-lg mx-auto bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-[32px] shadow-level-2 border border-slate-100 dark:border-slate-700 p-10 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] text-red-500 dark:text-red-400">block</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">
                            The User Directory is restricted to Administrators. Sign in with an Administrator account to view it.
                        </p>
                    </div>
                )}

                {viewState === 'sessionEnded' && (
                    <div className="max-w-lg mx-auto bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-[32px] shadow-level-2 border border-slate-100 dark:border-slate-700 p-10 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] text-amber-500 dark:text-amber-400">lock_clock</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Session Ended</h2>
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400 mb-6">
                            You've been signed out. Please sign in again to continue.
                        </p>
                        <a
                            href="/"
                            className="inline-block px-6 py-3 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors shadow-md"
                        >
                            Back to Home
                        </a>
                    </div>
                )}

                {(viewState === 'loading' || viewState === 'error' || viewState === 'success') && (
                    <div data-aos="fade-up" data-aos-delay="100">
                        <UserFilters
                            role={roleFilter}
                            status={statusFilter}
                            onRoleChange={applyRoleFilter}
                            onStatusChange={applyStatusFilter}
                            onShowPendingTeachers={showPendingTeachers}
                            onClear={clearFilters}
                        />
                    </div>
                )}

                {viewState === 'loading' && (
                    <div className="text-center py-32">
                        <span className="material-symbols-outlined text-[48px] text-slate-300 animate-spin">progress_activity</span>
                    </div>
                )}

                {viewState === 'error' && (
                    <div className="max-w-lg mx-auto bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-[32px] shadow-level-2 border border-red-100 p-10 text-center mt-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[28px] text-red-500 dark:text-red-400">error</span>
                        </div>
                        <p className="text-base font-bold text-red-600 dark:text-red-400">{errorMessage}</p>
                    </div>
                )}

                {viewState === 'success' && (
                    <div data-aos="fade-up" data-aos-delay="200" className="flex flex-col gap-4">
                        {actionError && (
                            <div className="px-6 py-4 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 text-sm font-bold text-red-600 dark:text-red-400 shadow-sm flex items-center gap-3">
                                <span className="material-symbols-outlined">warning</span>
                                {actionError}
                            </div>
                        )}

                        {/* Floating Cards List */}
                        <div className="space-y-4">
                            {users.length === 0 && (
                                <div className="bg-white dark:bg-slate-800/60 backdrop-blur-md rounded-[24px] border border-slate-100 dark:border-slate-700 px-6 py-16 text-center text-slate-500 dark:text-slate-400 font-medium shadow-sm">
                                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 block">search_off</span>
                                    {roleFilter || statusFilter
                                        ? 'No users match the current filter.'
                                        : 'No registered users yet.'}
                                </div>
                            )}
                            
                            {users.map((user) => (
                                <div key={user.email} className="group bg-white dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-md rounded-[24px] border border-slate-100 dark:border-slate-700 p-5 md:p-6 shadow-sm hover:shadow-lg transition-all flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                                    {/* Avatar & Info */}
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-black flex-shrink-0 shadow-md">
                                            {user.name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div className="truncate">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{user.name}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                                        </div>
                                    </div>

                                    {/* Role & Status Pill */}
                                    <div className="flex items-center gap-3 md:w-64 flex-shrink-0">
                                        <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm ${ROLE_STYLES[user.role] || 'text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900'}`}>
                                            <span className="material-symbols-outlined text-[14px]">
                                                {user.role === 'Admin' ? 'shield' : user.role === 'Teacher' ? 'school' : 'person'}
                                            </span>
                                            {user.role}
                                        </div>
                                        <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${STATUS_STYLES[user.status] || 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                                            {user.status}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 md:justify-end md:w-64 flex-shrink-0 mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-none border-slate-100 dark:border-slate-700">
                                        {confirmingDeleteId === user.id ? (
                                            <div className="flex flex-col gap-2 min-w-[180px]">
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Delete account? Cannot be undone.</p>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteUser(user)}
                                                        disabled={pendingActionId === user.id}
                                                        className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                                    >
                                                        {pendingActionId === user.id ? 'Deleting…' : 'Confirm'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmingDeleteId(null)}
                                                        disabled={pendingActionId === user.id}
                                                        className="px-3 py-1.5 rounded-full text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {user.status === 'Pending' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => runAccountAction(user, 'approve')}
                                                            disabled={pendingActionId === user.id}
                                                            className="flex-1 md:flex-none px-4 py-2 rounded-full text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center gap-1"
                                                        >
                                                            {pendingActionId === user.id ? 'Working…' : <><span className="material-symbols-outlined text-[16px]">check</span> Approve</>}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => runAccountAction(user, 'reject')}
                                                            disabled={pendingActionId === user.id}
                                                            className="flex-1 md:flex-none px-4 py-2 rounded-full text-xs font-bold bg-white dark:bg-slate-800 border border-red-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {user.status === 'Active' && user.email === currentUserEmail && (
                                                    <span className="px-3 py-1.5 text-xs font-bold text-slate-400 dark:text-slate-500" title="You can't deactivate your own account.">
                                                        You
                                                    </span>
                                                )}
                                                {user.status === 'Active' && user.email !== currentUserEmail && user.role !== 'Admin' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => runAccountAction(user, 'deactivate')}
                                                        disabled={pendingActionId === user.id}
                                                        className="px-4 py-2 rounded-full text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1"
                                                    >
                                                        {pendingActionId === user.id ? 'Working…' : <><span className="material-symbols-outlined text-[16px]">block</span> Deactivate</>}
                                                    </button>
                                                )}
                                                {user.status === 'Deactivated' && user.role !== 'Admin' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => runAccountAction(user, 'reactivate')}
                                                        disabled={pendingActionId === user.id}
                                                        className="px-4 py-2 rounded-full text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1"
                                                    >
                                                        {pendingActionId === user.id ? 'Working…' : <><span className="material-symbols-outlined text-[16px]">settings_backup_restore</span> Reactivate</>}
                                                    </button>
                                                )}
                                                {user.role !== 'Admin' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmingDeleteId(user.id)}
                                                        disabled={pendingActionId === user.id}
                                                        className="px-4 py-2 rounded-full text-xs font-bold bg-red-50 dark:bg-red-900/30 border border-red-200 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1"
                                                    >
                                                        {pendingActionId === user.id ? 'Working…' : <><span className="material-symbols-outlined text-[16px]">delete</span> Remove</>}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {totalCount > 0 && (
                            <div className="mt-6 flex flex-col items-center gap-2">
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                    Showing page {page} of {totalPages} &middot; {totalCount} total users
                                </p>
                                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                            </div>
                        )}
                    </div>
                )}
            </section>
        </Layout>
    );
}
