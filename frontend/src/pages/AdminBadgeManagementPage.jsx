import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { clearSession } from '../utils/session';

export default function AdminBadgeManagementPage() {
    const [role] = useState(() => localStorage.getItem('role'));
    const [viewState, setViewState] = useState('idle');
    const [badges, setBadges] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');

    const [name, setName] = useState('');
    const [iconName, setIconName] = useState('');
    const [criteria, setCriteria] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editIconName, setEditIconName] = useState('');
    const [editCriteria, setEditCriteria] = useState('');
    const [isEditSaving, setIsEditSaving] = useState(false);
    const [editError, setEditError] = useState('');

    const fetchBadges = async () => {
        try {
            setViewState('loading');
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/badges`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                clearSession();
                setViewState('sessionEnded');
                return;
            }
            if (response.status === 403) {
                setViewState('denied');
                return;
            }
            if (!response.ok) {
                throw new Error('Failed to load badges.');
            }

            const data = await response.json();
            setBadges(data);
            setViewState('success');
        } catch (err) {
            console.error('Error fetching badges:', err);
            setErrorMessage(err.message || 'Server connection error.');
            setViewState('error');
        }
    };

    useEffect(() => {
        if (role !== 'Admin') {
            setViewState('denied');
            return;
        }
        // fetchBadges handles its own errors; `void` marks the promise as intentionally not awaited.
        void fetchBadges();
    }, [role]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError('');
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/badges`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, iconName, criteria })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to create badge.');
            }

            const newBadge = await response.json();
            setBadges(prev => [...prev, newBadge]);
            setName('');
            setIconName('');
            setCriteria('');
        } catch (err) {
            setFormError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const startEditing = (badge) => {
        setEditingId(badge.id);
        setEditName(badge.name);
        setEditIconName(badge.iconName || '');
        setEditCriteria(badge.criteria);
        setEditError('');
    };

    const cancelEditing = () => {
        setEditingId(null);
    };

    const handleUpdate = async (e, id) => {
        e.preventDefault();
        setEditError('');
        setIsEditSaving(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/badges/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: editName, iconName: editIconName, criteria: editCriteria })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to update badge.');
            }

            setBadges(prev => prev.map(b => b.id === id ? { ...b, name: editName, iconName: editIconName, criteria: editCriteria } : b));
            setEditingId(null);
        } catch (err) {
            setEditError(err.message);
        } finally {
            setIsEditSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this badge template?')) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/badges/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete badge.');
            }

            setBadges(prev => prev.filter(b => b.id !== id));
        } catch (err) {
            alert(err.message);
        }
    };

    if (viewState === 'denied') {
        return (
            <Layout>
                <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
                    <span className="material-symbols-outlined text-6xl text-error mb-4">block</span>
                    <h1 className="text-display-lg text-on-surface mb-4">Access Denied</h1>
                    <p className="text-body-lg text-on-surface-variant">You do not have permission to manage badge templates.</p>
                </div>
            </Layout>
        );
    }

    if (viewState === 'sessionEnded') {
        return (
            <Layout>
                <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
                    <span className="material-symbols-outlined text-6xl text-error mb-4">logout</span>
                    <h1 className="text-display-lg text-on-surface mb-4">Session Ended</h1>
                    <p className="text-body-lg text-on-surface-variant mb-6">Your session has expired. Please log in again.</p>
                    <button onClick={() => window.openReactModal && window.openReactModal('login')} className="bg-primary text-on-primary px-6 py-2 rounded-full font-label-lg hover:bg-primary/90">
                        Log In
                    </button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-display-lg-mobile sm:text-display-lg text-on-surface mb-2">Master Badge Templates</h1>
                        <p className="text-body-lg text-on-surface-variant">Manage standardized achievements across the platform.</p>
                    </div>
                </div>

                <div className="bg-surface-container-low rounded-2xl p-6 sm:p-8 mb-12 border border-outline-variant/30">
                    <h2 className="text-headline-md text-on-surface mb-6">Create New Badge</h2>
                    {formError && (
                        <div className="bg-error-container text-on-error-container p-4 rounded-lg mb-6 text-body-md flex items-start gap-3">
                            <span className="material-symbols-outlined shrink-0">error</span>
                            {formError}
                        </div>
                    )}
                    <form onSubmit={handleCreate} className="space-y-6 max-w-2xl">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-label-md text-on-surface mb-2">Badge Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    placeholder="e.g. Code Ninja"
                                />
                            </div>
                            <div>
                                <label className="block text-label-md text-on-surface mb-2">Icon Name / URL</label>
                                <input
                                    type="text"
                                    value={iconName}
                                    onChange={e => setIconName(e.target.value)}
                                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    placeholder="e.g. emoji or material icon"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-label-md text-on-surface mb-2">Criteria *</label>
                            <textarea
                                required
                                value={criteria}
                                onChange={e => setCriteria(e.target.value)}
                                rows="3"
                                className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                                placeholder="Describe the criteria to earn this badge..."
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-primary text-on-primary px-8 py-3 rounded-full font-label-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSaving ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">add</span>}
                            Create Badge
                        </button>
                    </form>
                </div>

                {viewState === 'loading' ? (
                    <div className="text-center py-12">
                        <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
                    </div>
                ) : viewState === 'error' ? (
                    <div className="bg-error-container text-on-error-container p-6 rounded-2xl flex items-center justify-center gap-3">
                        <span className="material-symbols-outlined">wifi_off</span>
                        {errorMessage}
                    </div>
                ) : badges.length === 0 ? (
                    <div className="text-center py-12 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                        <span className="material-symbols-outlined text-6xl text-outline mb-4">military_tech</span>
                        <h3 className="text-headline-sm text-on-surface mb-2">No badges yet</h3>
                        <p className="text-body-md text-on-surface-variant">Create the first master badge template above.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {badges.map(badge => (
                            <div key={badge.id} className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30 hover:border-primary/30 transition-colors">
                                {editingId === badge.id ? (
                                    <form onSubmit={(e) => handleUpdate(e, badge.id)} className="space-y-4">
                                        {editError && (
                                            <div className="text-error text-label-sm">{editError}</div>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <input
                                                type="text"
                                                required
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:ring-2 focus:ring-primary"
                                                placeholder="Badge Name"
                                            />
                                            <input
                                                type="text"
                                                value={editIconName}
                                                onChange={e => setEditIconName(e.target.value)}
                                                className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:ring-2 focus:ring-primary"
                                                placeholder="Icon"
                                            />
                                        </div>
                                        <textarea
                                            required
                                            value={editCriteria}
                                            onChange={e => setEditCriteria(e.target.value)}
                                            rows="2"
                                            className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:ring-2 focus:ring-primary resize-none"
                                            placeholder="Criteria"
                                        />
                                        <div className="flex items-center gap-3 pt-2">
                                            <button
                                                type="submit"
                                                disabled={isEditSaving}
                                                className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md hover:bg-primary/90 disabled:opacity-50"
                                            >
                                                {isEditSaving ? 'Saving...' : 'Save'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={cancelEditing}
                                                disabled={isEditSaving}
                                                className="text-primary font-label-md hover:underline disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-2xl">{badge.iconName || 'military_tech'}</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-headline-sm text-on-surface">{badge.name}</h3>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => startEditing(badge)} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-variant hover:text-primary transition-colors" title="Edit">
                                                    <span className="material-symbols-outlined text-xl">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(badge.id)} className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error-container hover:text-error transition-colors" title="Delete">
                                                    <span className="material-symbols-outlined text-xl">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-body-md text-on-surface-variant">{badge.criteria}</p>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
