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

    return (
        <Layout>
            <section className="py-24 px-6 max-w-3xl mx-auto w-full min-h-[60vh]">
                <div className="mb-10 text-center">
                    <div className="inline-block mb-4 px-5 py-2 rounded-full bg-white/80 backdrop-blur-md text-slate-600 text-sm font-bold tracking-widest uppercase shadow-sm border border-slate-200">
                        Administrator
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-3">Category Management</h1>
                    <p className="text-lg font-medium text-slate-500">Create academic subject categories for Teachers to group their classes under.</p>
                </div>

                {viewState === 'denied' && (
                    <div className="max-w-lg mx-auto bg-white rounded-[24px] shadow-level-2 border border-slate-100 p-10 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] text-red-500">block</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
                        <p className="text-base font-medium text-slate-500">
                            Category management is restricted to Administrators. Sign in with an Administrator account to view it.
                        </p>
                    </div>
                )}

                {viewState === 'sessionEnded' && (
                    <div className="max-w-lg mx-auto bg-white rounded-[24px] shadow-level-2 border border-slate-100 p-10 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] text-amber-500">lock_clock</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Session Ended</h2>
                        <p className="text-base font-medium text-slate-500 mb-6">
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
                    <>
                        <form onSubmit={createCategory} className="bg-white rounded-[24px] shadow-level-2 border border-slate-100 p-10 mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">New Category</h2>

                            {formError && (
                                <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm font-bold text-red-600">
                                    {formError}
                                </div>
                            )}
                            {savedJustNow && (
                                <div className="mb-6 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-700">
                                    Category created and available immediately.
                                </div>
                            )}

                            <div className="space-y-5">
                                <div>
                                    <label htmlFor="category-name" className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">
                                        Category Name
                                    </label>
                                    <input
                                        id="category-name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Mathematics"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="category-description" className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        id="category-description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="A brief description of this subject area."
                                        required
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="mt-6 px-6 py-3 rounded-full text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            >
                                {isSaving ? 'Creating…' : 'Create Category'}
                            </button>
                        </form>

                        <div className="bg-white rounded-[24px] shadow-level-2 border border-slate-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-900">Existing Categories</h2>
                            </div>
                            {categories.length === 0 ? (
                                <p className="px-6 py-10 text-center text-slate-500 font-medium">No categories yet - create the first one above.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {categories.map((category) => (
                                        <li key={category.id} className="px-6 py-4">
                                            {editingId === category.id ? (
                                                <form onSubmit={saveEditedCategory} className="space-y-4">
                                                    {editError && (
                                                        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm font-bold text-red-600">
                                                            {editError}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <label htmlFor={`edit-name-${category.id}`} className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                                                            Category Name
                                                        </label>
                                                        <input
                                                            id={`edit-name-${category.id}`}
                                                            type="text"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            required
                                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label htmlFor={`edit-description-${category.id}`} className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                                                            Description
                                                        </label>
                                                        <textarea
                                                            id={`edit-description-${category.id}`}
                                                            value={editDescription}
                                                            onChange={(e) => setEditDescription(e.target.value)}
                                                            required
                                                            rows={2}
                                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                                                        />
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <button
                                                            type="submit"
                                                            disabled={isEditSaving}
                                                            className="px-5 py-2 rounded-full text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                                        >
                                                            {isEditSaving ? 'Saving…' : 'Save Changes'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={cancelEditingCategory}
                                                            disabled={isEditSaving}
                                                            className="px-5 py-2 rounded-full text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="font-bold text-slate-900">{category.name}</p>
                                                        <p className="text-sm text-slate-500 mt-1">{category.description}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEditingCategory(category)}
                                                        className="flex-none px-4 py-2 rounded-full text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </>
                )}
            </section>
        </Layout>
    );
}
