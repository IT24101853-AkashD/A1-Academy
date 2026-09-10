import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { clearSession } from '../utils/session';

// Where a category card on StudentCategoriesPage lands. There's no Class/Course entity yet (see
// Category.cs), so this doesn't filter a class list - it just confirms which subject was picked
// and holds the spot for the real listing a future ticket will build here.
export default function ClassesPage() {
    const [searchParams] = useSearchParams();
    const categoryId = searchParams.get('categoryId');

    const [viewState, setViewState] = useState('idle'); // idle | loading | success | missing | notFound | sessionEnded | error
    const [category, setCategory] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!categoryId) {
            setViewState('missing');
            return;
        }

        const token = localStorage.getItem('token');
        setViewState('loading');

        fetch(`${import.meta.env.VITE_API_URL}/api/categories/${categoryId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
                if (res.status === 401) {
                    clearSession();
                    setViewState('sessionEnded');
                    return null;
                }
                if (res.status === 404) {
                    setViewState('notFound');
                    return null;
                }
                if (!res.ok) {
                    throw new Error(`Request failed with status ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                if (data) {
                    setCategory(data);
                    setViewState('success');
                }
            })
            .catch((err) => {
                setErrorMessage(err.message || 'Server connection error.');
                setViewState('error');
            });
    }, [categoryId]);

    return (
        <Layout>
            <section className="py-24 px-6 max-w-3xl mx-auto w-full min-h-[60vh]">
                {viewState === 'missing' && (
                    <div className="max-w-lg mx-auto bg-white rounded-[24px] shadow-level-2 border border-slate-100 p-10 text-center">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Choose a Category</h2>
                        <p className="text-base font-medium text-slate-500 mb-6">
                            Browse categories first to see the classes available in a subject.
                        </p>
                        <Link
                            to="/student/categories"
                            className="inline-block px-6 py-3 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
                        >
                            Browse Categories
                        </Link>
                    </div>
                )}

                {viewState === 'notFound' && (
                    <div className="max-w-lg mx-auto bg-white rounded-[24px] shadow-level-2 border border-slate-100 p-10 text-center">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Category Not Found</h2>
                        <p className="text-base font-medium text-slate-500 mb-6">
                            This category may have been removed. Try browsing categories again.
                        </p>
                        <Link
                            to="/student/categories"
                            className="inline-block px-6 py-3 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
                        >
                            Browse Categories
                        </Link>
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

                {viewState === 'success' && category && (
                    <div className="text-center">
                        <div className="inline-block mb-4 px-5 py-2 rounded-full bg-white/80 backdrop-blur-md text-slate-600 text-sm font-bold tracking-widest uppercase shadow-sm border border-slate-200">
                            {category.name}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-3">Classes</h1>
                        <p className="text-lg font-medium text-slate-500 mb-10">{category.description}</p>

                        <div className="bg-white rounded-[24px] shadow-level-2 border border-slate-100 p-10">
                            <p className="text-base font-bold text-slate-900 mb-2">Class listings are coming soon.</p>
                            <p className="text-sm font-medium text-slate-500">
                                We're still building out class scheduling for {category.name}. Check back shortly.
                            </p>
                        </div>

                        <Link
                            to="/student/categories"
                            className="inline-block mt-8 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                        >
                            &larr; Back to Categories
                        </Link>
                    </div>
                )}
            </section>
        </Layout>
    );
}
