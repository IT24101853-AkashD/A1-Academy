import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { clearSession } from '../utils/session';

const ROLE_STYLES = {
    Student: 'bg-sky-50 text-sky-700 border-sky-200',
    Teacher: 'bg-violet-50 text-violet-700 border-violet-200',
    Admin: 'bg-amber-50 text-amber-700 border-amber-200',
};

const toFormValues = (profile) => ({
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    phoneNumber: profile?.phoneNumber ?? '',
});

export default function ProfilePage() {
    const [viewState, setViewState] = useState('idle'); // idle | loading | success | denied | sessionEnded | error
    const [profile, setProfile] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    // Edit mode is a layer on top of viewState === 'success' - the page only ever lets you edit
    // your own already-loaded profile, never someone else's, since there's nothing here that
    // could point it at a different user's record in the first place.
    const [isEditing, setIsEditing] = useState(false);
    const [formValues, setFormValues] = useState(toFormValues(null));
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [savedJustNow, setSavedJustNow] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            // Nothing to look up without a token - this is "you're not logged in", not a server
            // error, so it never even reaches fetch.
            setViewState('denied');
            return;
        }

        setViewState('loading');

        fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
                // Same distinction as the Admin User Directory: a 401 here means this token is
                // dead (expired, or the account was deactivated since it was issued) - the stale
                // token/role shouldn't keep lingering in localStorage once that's known.
                if (res.status === 401) {
                    clearSession();
                    setViewState('sessionEnded');
                    return null;
                }
                if (!res.ok) {
                    throw new Error(`Request failed with status ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                if (data) {
                    setProfile(data);
                    setViewState('success');
                }
            })
            .catch((err) => {
                setErrorMessage(err.message || 'Server connection error.');
                setViewState('error');
            });
    }, []);

    const startEditing = () => {
        setFormValues(toFormValues(profile));
        setSaveError('');
        setSavedJustNow(false);
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setSaveError('');
    };

    const updateField = (field) => (e) => {
        setFormValues((current) => ({ ...current, [field]: e.target.value }));
    };

    const saveProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveError('');
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    firstName: formValues.firstName,
                    lastName: formValues.lastName,
                    phoneNumber: formValues.phoneNumber,
                }),
            });

            if (res.status === 401) {
                // The admin's own session can die mid-edit too (e.g. someone else deactivates
                // this account while the form is open) - same full-page handling as elsewhere.
                clearSession();
                setViewState('sessionEnded');
                return;
            }

            if (!res.ok) {
                const message = await res.text();
                setSaveError(message || 'Could not save your changes. Please try again.');
                return;
            }

            const updated = await res.json();
            setProfile(updated);
            setIsEditing(false);
            setSavedJustNow(true);
        } catch {
            setSaveError('Server connection error. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Layout>
            <section className="py-24 px-6 max-w-2xl mx-auto w-full min-h-[60vh]">
                <div className="mb-10 text-center">
                    <div className="inline-block mb-4 px-5 py-2 rounded-full bg-white/80 backdrop-blur-md text-slate-600 text-sm font-bold tracking-widest uppercase shadow-sm border border-slate-200">
                        My Account
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-3">Profile</h1>
                    <p className="text-lg font-medium text-slate-500">Your current registered details on A1 Academy.</p>
                </div>

                {viewState === 'denied' && (
                    <div className="max-w-lg mx-auto bg-white rounded-[24px] shadow-level-2 border border-slate-100 p-10 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] text-red-500">block</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign In Required</h2>
                        <p className="text-base font-medium text-slate-500">
                            Sign in to view your profile details.
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

                {viewState === 'success' && profile && !isEditing && (
                    <div className="bg-white rounded-[24px] shadow-level-2 border border-slate-100 p-10">
                        <div className="flex items-start justify-between mb-8">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl font-black flex-none">
                                    {profile.name?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">{profile.name}</h2>
                                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold border ${ROLE_STYLES[profile.role] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                        {profile.role}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={startEditing}
                                className="px-5 py-2.5 rounded-full text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer transition-colors flex-none"
                            >
                                Edit Profile
                            </button>
                        </div>

                        {savedJustNow && (
                            <div className="mb-6 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-700">
                                Your profile has been updated.
                            </div>
                        )}

                        <dl className="divide-y divide-slate-100 border-t border-slate-100">
                            <div className="py-4 flex justify-between items-center">
                                <dt className="text-sm font-bold text-slate-500 uppercase tracking-wide">Name</dt>
                                <dd className="text-base font-medium text-slate-900">{profile.name}</dd>
                            </div>
                            <div className="py-4 flex justify-between items-center">
                                <dt className="text-sm font-bold text-slate-500 uppercase tracking-wide">Email</dt>
                                <dd className="text-base font-medium text-slate-900">{profile.email}</dd>
                            </div>
                            <div className="py-4 flex justify-between items-center">
                                <dt className="text-sm font-bold text-slate-500 uppercase tracking-wide">Phone Number</dt>
                                <dd className="text-base font-medium text-slate-900">{profile.phoneNumber || '—'}</dd>
                            </div>
                            <div className="py-4 flex justify-between items-center">
                                <dt className="text-sm font-bold text-slate-500 uppercase tracking-wide">Role</dt>
                                <dd className="text-base font-medium text-slate-900">{profile.role}</dd>
                            </div>
                        </dl>
                    </div>
                )}

                {viewState === 'success' && profile && isEditing && (
                    <form onSubmit={saveProfile} className="bg-white rounded-[24px] shadow-level-2 border border-slate-100 p-10">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Edit Profile</h2>

                        {saveError && (
                            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm font-bold text-red-600">
                                {saveError}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label htmlFor="profile-first-name" className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">
                                    First Name
                                </label>
                                <input
                                    id="profile-first-name"
                                    type="text"
                                    value={formValues.firstName}
                                    onChange={updateField('firstName')}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>
                            <div>
                                <label htmlFor="profile-last-name" className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">
                                    Last Name
                                </label>
                                <input
                                    id="profile-last-name"
                                    type="text"
                                    value={formValues.lastName}
                                    onChange={updateField('lastName')}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>
                            <div>
                                <label htmlFor="profile-phone" className="block text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">
                                    Phone Number
                                </label>
                                <input
                                    id="profile-phone"
                                    type="tel"
                                    value={formValues.phoneNumber}
                                    onChange={updateField('phoneNumber')}
                                    placeholder="e.g. +1 555-0100"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>

                            {/* Email and Role are shown but never editable here - Email is the
                                login identifier and Role is Admin-controlled (see UsersController) -
                                so the form doesn't even offer inputs for them. */}
                            <div className="pt-2 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="block font-bold text-slate-400 uppercase tracking-wide text-xs mb-1">Email</span>
                                    <span className="font-medium text-slate-500">{profile.email}</span>
                                </div>
                                <div>
                                    <span className="block font-bold text-slate-400 uppercase tracking-wide text-xs mb-1">Role</span>
                                    <span className="font-medium text-slate-500">{profile.role}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-6 py-3 rounded-full text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            >
                                {isSaving ? 'Saving…' : 'Save Changes'}
                            </button>
                            <button
                                type="button"
                                onClick={cancelEditing}
                                disabled={isSaving}
                                className="px-6 py-3 rounded-full text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </section>
        </Layout>
    );
}
