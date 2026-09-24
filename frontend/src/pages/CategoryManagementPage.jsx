import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { clearSession } from '../utils/session';

export default function CategoryManagementPage() {
    // Client-side gate is a UX nicety only - both endpoints are protected server-side
    // ([Authorize] for reads, [Authorize(Roles = "Admin")] for creation - see
    // CategoriesController), so a Student/Teacher (or a tampered localStorage value) gets a real
    // 401/403 from the API regardless of what this component decides to render.
    const [role] = useState(() => localStorage.getItem('role'));
    const [viewState, setViewState] = useState('idle'); // idle | loading | success | denied | sessionEnded | error
    const [categories, setCategories] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [savedJustNow, setSavedJustNow] = useState(false);

    // Editing an existing category is a separate, per-row mode from the "New Category" form
    // above - only one category can be mid-edit at a time, tracked by id rather than index so it
    // survives the list re-sorting after a save.
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [isEditSaving, setIsEditSaving] = useState(false);
    const [editError, setEditError] = useState('');

    // Deleting is confirmed inline, per row - the same "only one thing active at a time, tracked
    // by id" approach as editing above, rather than a blocking window.confirm() popup.
    const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // "Other, please specify" subjects Teachers typed at registration - reviewed here, not
    // auto-created as Categories, since a typo or a joke entry shouldn't become a real subject
    // without a human looking at it first. Loaded independently of the Category list above so a
    // slow/failed fetch of one doesn't block the other.
    const [subjectRequests, setSubjectRequests] = useState([]);
    const [requestsViewState, setRequestsViewState] = useState('idle'); // idle | loading | success | error
    const [requestsError, setRequestsError] = useState('');
    // Which pending request is mid-review (picking a Category to approve it against), tracked by
    // id the same one-active-at-a-time way as editing/deleting a Category above.
    const [reviewingRequestId, setReviewingRequestId] = useState(null);
    const [reviewCategoryId, setReviewCategoryId] = useState('');
    const [isReviewing, setIsReviewing] = useState(false);
    const [reviewError, setReviewError] = useState('');

    const loadSubjectRequests = () => {
        const token = localStorage.getItem('token');
        setRequestsViewState('loading');

        return fetch(`${import.meta.env.VITE_API_URL}/api/teacher-subject-requests`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
                if (res.status === 401) {
                    clearSession();
                    setViewState('sessionEnded');
                    return null;
                }
                if (res.status === 403) {
                    // The Category list above already renders its own "Access Denied" state for
                    // this - nothing further to show for this section specifically.
                    return null;
                }
                if (!res.ok) {
                    throw new Error(`Request failed with status ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                if (data) {
                    setSubjectRequests(data);
                    setRequestsViewState('success');
                }
            })
            .catch((err) => {
                setRequestsError(err.message || 'Server connection error.');
                setRequestsViewState('error');
            });
    };

    const startReviewingRequest = (request) => {
        setReviewingRequestId(request.id);
        setReviewCategoryId('');
        setReviewError('');
    };

    const cancelReviewingRequest = () => {
        setReviewingRequestId(null);
        setReviewError('');
    };

    const approveSubjectRequest = async (id) => {
        if (!reviewCategoryId) {
            setReviewError('Pick which Category this subject maps to - add it above first if it doesn\'t exist yet.');
            return;
        }
        setIsReviewing(true);
        setReviewError('');
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/teacher-subject-requests/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ categoryId: Number(reviewCategoryId) }),
            });

            if (res.status === 401) {
                clearSession();
                setViewState('sessionEnded');
                return;
            }

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                setReviewError(body?.message || 'Could not approve this request. Please try again.');
                return;
            }

            // Approved requests leave the Pending queue this page shows, the same way a deleted
            // Category leaves its list immediately above.
            setSubjectRequests((current) => current.filter((r) => r.id !== id));
            setReviewingRequestId(null);
        } catch {
            setReviewError('Server connection error. Please try again.');
        } finally {
            setIsReviewing(false);
        }
    };

    const rejectSubjectRequest = async (id) => {
        setIsReviewing(true);
        setReviewError('');
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/teacher-subject-requests/${id}/reject`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401) {
                clearSession();
                setViewState('sessionEnded');
                return;
            }

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                setReviewError(body?.message || 'Could not reject this request. Please try again.');
                return;
            }

            setSubjectRequests((current) => current.filter((r) => r.id !== id));
            setReviewingRequestId(null);
        } catch {
            setReviewError('Server connection error. Please try again.');
        } finally {
            setIsReviewing(false);
        }
    };

    useEffect(() => {
        if (window.AOS) {
            window.AOS.init({
                once: false,
                offset: 50,
                duration: 800,
                easing: 'ease-out-cubic'
            });
        }
    }, []);

    const loadCategories = () => {
        const token = localStorage.getItem('token');
        setViewState('loading');

        return fetch(`${import.meta.env.VITE_API_URL}/api/categories`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
                // Same distinction used on the other Admin pages: 401 means this token is dead
                // (expired, or the account was deactivated since it was issued) - 403 means a
                // real, live session that just isn't allowed here.
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
                    setCategories(data);
                    setViewState('success');
                }
            })
            .catch((err) => {
                setErrorMessage(err.message || 'Server connection error.');
                setViewState('error');
            });
    };

    useEffect(() => {
        if (role !== 'Admin') {
            setViewState('denied');
            return;
        }
        loadCategories();
        loadSubjectRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [role]);

    const createCategory = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setFormError('');
        setSavedJustNow(false);
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name, description }),
            });

            if (res.status === 401) {
                clearSession();
                setViewState('sessionEnded');
                return;
            }

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                setFormError(body?.message || 'Could not create this category. Please try again.');
                return;
            }

            const created = await res.json();
            // New category, immediately reflected in the list - matches the acceptance
            // criterion ("immediately available") without waiting on a full reload.
            setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
            setName('');
            setDescription('');
            setSavedJustNow(true);
        } catch {
            setFormError('Server connection error. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const startEditingCategory = (category) => {
        setEditingId(category.id);
        setEditName(category.name);
        setEditDescription(category.description);
        setEditError('');
    };

    const cancelEditingCategory = () => {
        setEditingId(null);
        setEditError('');
    };

    const saveEditedCategory = async (e) => {
        e.preventDefault();
        setIsEditSaving(true);
        setEditError('');
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/categories/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: editName, description: editDescription }),
            });

            if (res.status === 401) {
                clearSession();
                setViewState('sessionEnded');
                return;
            }

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                setEditError(body?.message || 'Could not save these changes. Please try again.');
                return;
            }

            const updated = await res.json();
            // Reflected in this list immediately, the same way a new category is - the Student
            // browsing grid and any Teacher scheduling form pick it up on their own next fetch,
            // since nothing here caches the old value for them.
            setCategories((current) =>
                current
                    .map((category) => (category.id === updated.id ? updated : category))
                    .sort((a, b) => a.name.localeCompare(b.name))
            );
            setEditingId(null);
        } catch {
            setEditError('Server connection error. Please try again.');
        } finally {
            setIsEditSaving(false);
        }
    };

    const startDeletingCategory = (category) => {
        setConfirmingDeleteId(category.id);
        setDeleteError('');
    };

    const cancelDeletingCategory = () => {
        setConfirmingDeleteId(null);
        setDeleteError('');
    };

    const confirmDeleteCategory = async (id) => {
        setIsDeleting(true);
        setDeleteError('');
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/categories/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401) {
                clearSession();
                setViewState('sessionEnded');
                return;
            }

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                setDeleteError(body?.message || 'Could not delete this category. Please try again.');
                return;
            }

            // Permanently removed - reflected here immediately, same as a create or edit, so the
            // catalog reads as clean without waiting on a full reload.
            setCategories((current) => current.filter((category) => category.id !== id));
            setConfirmingDeleteId(null);
        } catch {
            setDeleteError('Server connection error. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Layout>
            <div className="fixed inset-0 z-[-1] gradient-bg font-jakarta"></div>
            <section className="py-24 px-6 max-w-3xl mx-auto w-full min-h-[60vh] font-jakarta">
                <div data-aos="fade-up" className="mb-10 text-center">
                    <div className="inline-flex items-center gap-2 mb-4 px-5 py-2 rounded-full bg-white dark:bg-slate-800/80 backdrop-blur-md text-slate-600 dark:text-slate-300 text-sm font-bold tracking-widest uppercase shadow-sm border border-slate-200 dark:border-slate-700">
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">admin_panel_settings</span>
                        Administrator
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-3">Category Management</h1>
                    <p className="text-lg font-medium text-slate-500 dark:text-slate-400">Create academic subject categories for Teachers to group their classes under.</p>
                </div>

                {viewState === 'denied' && (
                    <div className="max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-[24px] shadow-level-2 border border-slate-100 dark:border-slate-700 p-10 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 dark:bg-red-900/30 ring-8 ring-red-50/50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] text-red-500 dark:text-red-400" aria-hidden="true">block</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400">
                            Category management is restricted to Administrators. Sign in with an Administrator account to view it.
                        </p>
                    </div>
                )}

                {viewState === 'sessionEnded' && (
                    <div className="max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-[24px] shadow-level-2 border border-slate-100 dark:border-slate-700 p-10 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-50 dark:bg-amber-900/30 ring-8 ring-amber-50/50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] text-amber-500 dark:text-amber-400" aria-hidden="true">lock_clock</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Session Ended</h2>
                        <p className="text-base font-medium text-slate-500 dark:text-slate-400 mb-6">
                            You've been signed out - this can happen if your account's status changed. Please sign in again to continue.
                        </p>
                        <a
                            href="/"
                            className="inline-block px-6 py-3 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
                        >
                            Back to Home
                        </a>
                    </div>
                )}

                {viewState === 'loading' && (
                    <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-level-2 border border-slate-100 dark:border-slate-700 py-24 text-center">
                        <span className="material-symbols-outlined text-[40px] text-slate-300 animate-spin" aria-hidden="true">progress_activity</span>
                        <p className="mt-3 text-sm font-bold text-slate-400 dark:text-slate-500">Loading categories…</p>
                    </div>
                )}

                {viewState === 'error' && (
                    <div className="max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-[24px] shadow-level-2 border border-slate-100 dark:border-slate-700 p-10 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 dark:bg-red-900/30 ring-8 ring-red-50/50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] text-red-500 dark:text-red-400" aria-hidden="true">error</span>
                        </div>
                        <p className="text-base font-bold text-red-500 dark:text-red-400">{errorMessage}</p>
                    </div>
                )}

                {viewState === 'success' && (
                    <>
                        <form data-aos="fade-up" data-aos-delay="100" onSubmit={createCategory} className="bg-white dark:bg-slate-800 rounded-[24px] shadow-level-2 border border-slate-100 dark:border-slate-700 p-10 mb-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-none">
                                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[20px]" aria-hidden="true">add_circle</span>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">New Category</h2>
                            </div>

                            {formError && (
                                <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 text-sm font-bold text-red-600 dark:text-red-400">
                                    <span className="material-symbols-outlined text-[18px] leading-none mt-0.5" aria-hidden="true">error</span>
                                    {formError}
                                </div>
                            )}
                            {savedJustNow && (
                                <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                    <span className="material-symbols-outlined text-[18px] leading-none mt-0.5" aria-hidden="true">check_circle</span>
                                    Category created and available immediately.
                                </div>
                            )}

                            <div className="space-y-5">
                                <div>
                                    <label htmlFor="category-name" className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                                        Category Name
                                    </label>
                                    <input
                                        id="category-name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Mathematics"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="category-description" className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        id="category-description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="A brief description of this subject area."
                                        required
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 resize-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
                            >
                                <span className={`material-symbols-outlined text-[18px] ${isSaving ? 'animate-spin' : ''}`} aria-hidden="true">
                                    {isSaving ? 'progress_activity' : 'add'}
                                </span>
                                {isSaving ? 'Creating…' : 'Create Category'}
                            </button>
                        </form>

                        <div data-aos="fade-up" data-aos-delay="200" className="bg-white dark:bg-slate-800 rounded-[24px] shadow-level-2 border border-slate-100 dark:border-slate-700 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Existing Categories</h2>
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-full px-2.5 py-1 tabular-nums">
                                    {categories.length}
                                </span>
                            </div>
                            {categories.length === 0 ? (
                                <div className="px-6 py-16 text-center">
                                    <span className="material-symbols-outlined text-[32px] text-slate-300 block mb-2" aria-hidden="true">category</span>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">No categories yet - create the first one above.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {categories.map((category) => (
                                        <li key={category.id} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                                            {editingId === category.id ? (
                                                <form onSubmit={saveEditedCategory} className="space-y-4">
                                                    {editError && (
                                                        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 text-sm font-bold text-red-600 dark:text-red-400">
                                                            <span className="material-symbols-outlined text-[18px] leading-none mt-0.5" aria-hidden="true">error</span>
                                                            {editError}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <label htmlFor={`edit-name-${category.id}`} className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                                                            Category Name
                                                        </label>
                                                        <input
                                                            id={`edit-name-${category.id}`}
                                                            type="text"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            required
                                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label htmlFor={`edit-description-${category.id}`} className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                                                            Description
                                                        </label>
                                                        <textarea
                                                            id={`edit-description-${category.id}`}
                                                            value={editDescription}
                                                            onChange={(e) => setEditDescription(e.target.value)}
                                                            required
                                                            rows={2}
                                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 resize-none"
                                                        />
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <button
                                                            type="submit"
                                                            disabled={isEditSaving}
                                                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
                                                        >
                                                            <span className={`material-symbols-outlined text-[16px] ${isEditSaving ? 'animate-spin' : ''}`} aria-hidden="true">
                                                                {isEditSaving ? 'progress_activity' : 'check'}
                                                            </span>
                                                            {isEditSaving ? 'Saving…' : 'Save Changes'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={cancelEditingCategory}
                                                            disabled={isEditSaving}
                                                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </form>
                                            ) : confirmingDeleteId === category.id ? (
                                                <div className="space-y-4">
                                                    {deleteError && (
                                                        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 text-sm font-bold text-red-600 dark:text-red-400">
                                                            <span className="material-symbols-outlined text-[18px] leading-none mt-0.5" aria-hidden="true">error</span>
                                                            {deleteError}
                                                        </div>
                                                    )}
                                                    <p className="flex items-start gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
                                                        <span className="material-symbols-outlined text-[17px] text-red-500 dark:text-red-400 leading-none mt-0.5" aria-hidden="true">warning</span>
                                                        Delete "{category.name}"? This can't be undone.
                                                    </p>
                                                    <div className="flex gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => confirmDeleteCategory(category.id)}
                                                            disabled={isDeleting}
                                                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
                                                        >
                                                            <span className={`material-symbols-outlined text-[16px] ${isDeleting ? 'animate-spin' : ''}`} aria-hidden="true">
                                                                {isDeleting ? 'progress_activity' : 'delete_forever'}
                                                            </span>
                                                            {isDeleting ? 'Deleting…' : 'Confirm Delete'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={cancelDeletingCategory}
                                                            disabled={isDeleting}
                                                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-none mt-0.5">
                                                            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[18px]" aria-hidden="true">category</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-slate-900 dark:text-white">{category.name}</p>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{category.description}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex-none flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => startEditingCategory(category)}
                                                            className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit</span>
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => startDeletingCategory(category)}
                                                            className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold bg-white dark:bg-slate-800 border border-red-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-level-2 border border-slate-100 dark:border-slate-700 overflow-hidden mt-10">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-none">
                                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[20px]" aria-hidden="true">contact_support</span>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pending Subject Requests</h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            Subjects Teachers typed under "Other" at registration because they weren't in the list yet.
                                            Add a matching Category above if it's a real subject, then approve the request against it.
                                        </p>
                                    </div>
                                </div>
                                {requestsViewState === 'success' && subjectRequests.length > 0 && (
                                    <span className="flex-none text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 rounded-full px-2.5 py-1 tabular-nums">
                                        {subjectRequests.length}
                                    </span>
                                )}
                            </div>

                            {requestsViewState === 'loading' && (
                                <div className="text-center py-10">
                                    <span className="material-symbols-outlined text-[32px] text-slate-300 animate-spin" aria-hidden="true">progress_activity</span>
                                </div>
                            )}

                            {requestsViewState === 'error' && (
                                <p className="px-6 py-10 text-center text-red-500 dark:text-red-400 font-bold">{requestsError}</p>
                            )}

                            {requestsViewState === 'success' && (
                                subjectRequests.length === 0 ? (
                                    <div className="px-6 py-16 text-center">
                                        <span className="material-symbols-outlined text-[32px] text-slate-300 block mb-2" aria-hidden="true">task_alt</span>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium">No pending requests right now.</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {subjectRequests.map((request) => (
                                            <li key={request.id} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                                                {reviewingRequestId === request.id ? (
                                                    <div className="space-y-4">
                                                        {reviewError && (
                                                            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 text-sm font-bold text-red-600 dark:text-red-400">
                                                                <span className="material-symbols-outlined text-[18px] leading-none mt-0.5" aria-hidden="true">error</span>
                                                                {reviewError}
                                                            </div>
                                                        )}
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                            Reviewing "{request.proposedName}" for {request.teacherName} ({request.teacherEmail})
                                                        </p>
                                                        <div>
                                                            <label htmlFor={`review-category-${request.id}`} className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                                                                Map to Category (needed to approve)
                                                            </label>
                                                            {categories.length === 0 ? (
                                                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No categories exist yet - create one above first.</p>
                                                            ) : (
                                                                <select
                                                                    id={`review-category-${request.id}`}
                                                                    value={reviewCategoryId}
                                                                    onChange={(e) => setReviewCategoryId(e.target.value)}
                                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100"
                                                                >
                                                                    <option value="">Select a category…</option>
                                                                    {categories.map((category) => (
                                                                        <option key={category.id} value={category.id}>{category.name}</option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => approveSubjectRequest(request.id)}
                                                                disabled={isReviewing || categories.length === 0}
                                                                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
                                                            >
                                                                <span className={`material-symbols-outlined text-[16px] ${isReviewing ? 'animate-spin' : ''}`} aria-hidden="true">
                                                                    {isReviewing ? 'progress_activity' : 'check_circle'}
                                                                </span>
                                                                {isReviewing ? 'Approving…' : 'Approve'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => rejectSubjectRequest(request.id)}
                                                                disabled={isReviewing}
                                                                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold bg-white dark:bg-slate-800 border border-red-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">cancel</span>
                                                                Reject
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={cancelReviewingRequest}
                                                                disabled={isReviewing}
                                                                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex items-start gap-3 min-w-0">
                                                            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-none mt-0.5">
                                                                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[18px]" aria-hidden="true">help</span>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-slate-900 dark:text-white">"{request.proposedName}"</p>
                                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{request.teacherName} · {request.teacherEmail}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex-none">
                                                            <button
                                                                type="button"
                                                                onClick={() => startReviewingRequest(request)}
                                                                className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">visibility</span>
                                                                Review
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )
                            )}
                        </div>
                    </>
                )}
            </section>
        </Layout>
    );
}
