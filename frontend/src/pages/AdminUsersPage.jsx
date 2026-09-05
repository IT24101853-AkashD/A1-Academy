import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import UserFilters from '../components/UserFilters';

const STATUS_STYLES = {
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
    Deactivated: 'bg-slate-100 text-slate-600 border-slate-200',
};

// What the account status API errors would call "not a valid action from here" messages, kept
// friendly per action instead of surfacing the raw status code to whoever's clicking the button.
const ACTION_ERROR_MESSAGES = {
    approve: 'Could not approve this teacher. Please try again.',
    reject: 'Could not reject this application. Please try again.',
    deactivate: 'Could not deactivate this account. Please try again.',
    reactivate: 'Could not reactivate this account. Please try again.',
};

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
    // Client-side gate is a UX nicety only - GET /api/users is protected server-side by
    // [Authorize(Roles = "Admin")], so a Student/Teacher (or a tampered localStorage value)
    // gets a real 403 from the API regardless of what this component decides to render.
    const [role] = useState(() => localStorage.getItem('role'));
    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [viewState, setViewState] = useState('idle'); // idle | loading | success | denied | error
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    // Tracks which row has an account-action (approve/reject/deactivate/reactivate) mid-request,
    // so we can disable just that one button instead of freezing the whole table.
    const [pendingActionId, setPendingActionId] = useState(null);
    const [actionError, setActionError] = useState('');

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
                if (res.status === 401 || res.status === 403) {
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

    // Runs one of the account actions (approve/reject/deactivate/reactivate) against a single
    // row. All four work the same way on the frontend - hit PATCH /api/users/{id}/{action} and
    // either update the row in place or drop it from view, depending on whether it still
    // matches whatever status filter the admin currently has selected.
    const runAccountAction = async (user, action) => {
        setPendingActionId(user.id);
        setActionError('');
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/${user.id}/${action}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                throw new Error(`${action} failed with status ${res.status}`);
            }

            const updated = await res.json();
            // If a status filter is active and the account's new status no longer matches it,
            // the row doesn't belong on screen anymore - e.g. approving out of a "Pending" view.
            const dropsOutOfView = Boolean(statusFilter) && updated.status !== statusFilter;

            setUsers((current) =>
                dropsOutOfView
                    ? current.filter((u) => u.id !== user.id)
                    : current.map((u) => (u.id === user.id ? updated : u))
            );
            if (dropsOutOfView) {
                setTotalCount((count) => Math.max(count - 1, 0));
            }
        } catch {
            // Whatever went wrong (network blip, 4xx/5xx), the admin doesn't need the raw
            // status code - just a plain "it didn't work, try again" message.
            setActionError(ACTION_ERROR_MESSAGES[action] || 'That action could not be completed. Please try again.');
        } finally {
            setPendingActionId(null);
        }
    };

    return (
        <Layout>
            <section className="py-24 px-6 max-w-6xl mx-auto w-full min-h-[60vh]">
                <div className="mb-10 text-center">
                    <div className="inline-block mb-4 px-5 py-2 rounded-full bg-white/80 backdrop-blur-md text-slate-600 text-sm font-bold tracking-widest uppercase shadow-sm border border-slate-200">
                        Administrator
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-3">User Directory</h1>
                    <p className="text-lg font-medium text-slate-500">All registered students, teachers, and administrators on the platform.</p>
                </div>

                {viewState === 'denied' && (
                    <div className="max-w-lg mx-auto bg-white rounded-[24px] shadow-level-2 border border-slate-100 p-10 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] text-red-500">block</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
                        <p className="text-base font-medium text-slate-500">
                            The User Directory is restricted to Administrators. Sign in with an Administrator account to view it.
                        </p>
                    </div>
                )}

                {(viewState === 'loading' || viewState === 'error' || viewState === 'success') && (
                    <UserFilters
                        role={roleFilter}
                        status={statusFilter}
                        onRoleChange={applyRoleFilter}
                        onStatusChange={applyStatusFilter}
                        onShowPendingTeachers={showPendingTeachers}
                        onClear={clearFilters}
                    />
                )}

                {viewState === 'loading' && (
                    <div className="text-center py-20">
                        <span className="material-symbols-outlined text-[40px] text-slate-400 animate-spin">progress_activity</span>
                    </div>
                )}

                {viewState === 'error' && (
                    <div className="max-w-lg mx-auto bg-white rounded-[24px] shadow-level-2 border border-slate-100 p-10 text-center">
                        <p className="text-base font-bold text-red-500">{errorMessage}</p>
                    </div>
                )}

                {viewState === 'success' && (
                    <div className="bg-white rounded-[24px] shadow-level-2 border border-slate-100 overflow-hidden">
                        {actionError && (
                            <div className="px-6 py-3 bg-red-50 border-b border-red-100 text-sm font-bold text-red-600">
                                {actionError}
                            </div>
                        )}
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wide">Name</th>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wide">Email</th>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wide">Role</th>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wide">Status</th>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-medium">
                                            {roleFilter || statusFilter
                                                ? 'No users match the current filter.'
                                                : 'No registered users yet.'}
                                        </td>
                                    </tr>
                                )}
                                {users.map((user) => (
                                    <tr key={user.email} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900">{user.name}</td>
                                        <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                        <td className="px-6 py-4 text-slate-600">{user.role}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[user.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {user.status === 'Pending' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => runAccountAction(user, 'approve')}
                                                            disabled={pendingActionId === user.id}
                                                            className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                                        >
                                                            {pendingActionId === user.id ? 'Working…' : 'Approve'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => runAccountAction(user, 'reject')}
                                                            disabled={pendingActionId === user.id}
                                                            className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {user.status === 'Active' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => runAccountAction(user, 'deactivate')}
                                                        disabled={pendingActionId === user.id}
                                                        className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                                    >
                                                        {pendingActionId === user.id ? 'Working…' : 'Deactivate'}
                                                    </button>
                                                )}
                                                {user.status === 'Deactivated' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => runAccountAction(user, 'reactivate')}
                                                        disabled={pendingActionId === user.id}
                                                        className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                                    >
                                                        {pendingActionId === user.id ? 'Working…' : 'Reactivate'}
                                                    </button>
                                                )}
                                                {/* Rejected is a dead end by design - see AccountStatusTransitions - so no
                                                    action renders here. A rejected applicant re-registers instead. */}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {totalCount > 0 && (
                            <div className="px-6 py-4 border-t border-slate-100 flex flex-col items-center gap-1">
                                <p className="text-sm font-medium text-slate-500">
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
