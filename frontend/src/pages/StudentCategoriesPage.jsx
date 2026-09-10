import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { clearSession } from '../utils/session';

// Every category returned by GET /api/categories is "active" as far as this page is concerned -
// there's no draft/archived state on the Category model (see CategoriesController), so the full
// list already is the "active categories" the acceptance criteria asks for.
export default function StudentCategoriesPage() {
    const navigate = useNavigate();

    // Client-side gate is a UX nicety only, same as CategoryManagementPage - GET /api/categories
    // is genuinely open to any authenticated role server-side, but this page is the Student's
    // browsing experience specifically, so a Teacher/Admin (or a tampered localStorage value)
    // sees the same Access Denied a Student would see on an Admin-only page.
    const [role] = useState(() => localStorage.getItem('role'));
    const [viewState, setViewState] = useState('idle'); // idle | loading | success | denied | sessionEnded | error
    const [categories, setCategories] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (role !== 'Student') {
            setViewState('denied');
            return;
        }

        const token = localStorage.getItem('token');
        setViewState('loading');

        fetch(`${import.meta.env.VITE_API_URL}/api/categories`, {
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
                    setCategories(data);
                    setViewState('success');
                }
            })
            .catch((err) => {
                setErrorMessage(err.message || 'Server connection error.');
                setViewState('error');
            });
    }, [role]);

    // Scenario 2 - clicking a category takes the Student to a filtered list of classes for that
    // subject. There's no Class entity yet to actually filter (see Category.cs), so this hands
    // off to a route that will grow into the real class listing later; today it just carries the
    // chosen category along.
    const openCategory = (category) => {
        navigate(`/classes?categoryId=${category.id}`);
    };

    const handleCardKeyDown = (category) => (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openCategory(category);
        }
    };

    return (
        <Layout>
            <section className="py-24 px-6 max-w-6xl mx-auto w-full min-h-[60vh]">
                <div className="mb-10 text-center">
                    <div className="inline-block mb-4 px-5 py-2 rounded-full bg-white/80 backdrop-blur-md text-slate-600 text-sm font-bold tracking-widest uppercase shadow-sm border border-slate-200">
                        Browse Subjects
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-3">Categories</h1>
                    <p className="text-lg font-medium text-slate-500">Pick a subject to see the classes available in it.</p>
                </div>

                {viewState === 'denied' && (
                    <div className="max-w-lg mx-auto bg-white rounded-[24px] shadow-level-2 border border-slate-100 p-10 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] text-red-500">block</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
                        <p className="text-base font-medium text-slate-500">
                            Category browsing is available to Students. Sign in with a Student account to view it.
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
                    categories.length === 0 ? (
                        <div className="bg-white rounded-[24px] shadow-level-2 border border-slate-100 p-10 text-center">
                            <p className="text-base font-medium text-slate-500">No categories yet - check back soon.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {categories.map((category) => (
                                <div
                                    key={category.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => openCategory(category)}
                                    onKeyDown={handleCardKeyDown(category)}
                                    className="text-left bg-white rounded-[24px] shadow-level-2 border border-slate-100 p-8 cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-slate-900"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6">
                                        <span className="material-symbols-outlined text-3xl">auto_stories</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-2">{category.name}</h2>
                                    <p className="text-sm text-slate-500 leading-relaxed">{category.description}</p>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </section>
        </Layout>
    );
}
