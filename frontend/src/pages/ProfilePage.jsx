import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { clearSession } from '../utils/session';

const ROLE_STYLES = {
    Student: 'bg-sky-50 text-sky-700 border-sky-200',
    Teacher: 'bg-violet-50 text-violet-700 border-violet-200',
    Admin: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function ProfilePage() {
    const [viewState, setViewState] = useState('idle'); // idle | loading | success | denied | sessionEnded | error
    const [profile, setProfile] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

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

                {viewState === 'success' && profile && (
                    <div className="bg-white rounded-[24px] shadow-level-2 border border-slate-100 p-10">
                        <div className="flex items-center gap-5 mb-8">
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
                                <dt className="text-sm font-bold text-slate-500 uppercase tracking-wide">Role</dt>
                                <dd className="text-base font-medium text-slate-900">{profile.role}</dd>
                            </div>
                        </dl>
                    </div>
                )}
            </section>
        </Layout>
    );
}
