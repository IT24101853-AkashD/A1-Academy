import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

// Shown when the live category list can't be loaded (API down, or no categories created yet),
// so the section never renders empty.
const fallbackSubjects = [
    { id: 'math', name: 'Mathematics', description: 'Master algebra, calculus, geometry and statistics with expert guidance.' },
    { id: 'sci', name: 'Science', description: 'Discover the wonders of physics, chemistry, and biology subjects.' },
    { id: 'comp', name: 'Computing', description: 'Learn coding, data structures, algorithms, and artificial intelligence.' },
    { id: 'lang', name: 'Languages', description: 'Achieve fluency in new languages through immersive learning.' }
];

// Categories don't store an icon, so pick one from keywords in the name.
const subjectIcons = [
    [/math|algebra|calculus|statistic|geometry/i, 'calculate'],
    [/physic|chemi|biolog|science/i, 'science'],
    [/comput|ict|program|coding|software|information/i, 'computer'],
    [/english|language|tamil|sinhala|french|literature/i, 'translate'],
    [/history|geograph|social|civic/i, 'public'],
    [/art|music|drama|dance/i, 'palette'],
    [/business|account|commerce|econom/i, 'account_balance'],
];
const iconFor = (name) => (subjectIcons.find(([re]) => re.test(name)) || [null, 'menu_book'])[1];

const steps = [
    { icon: 'person_add', title: 'Create your account', desc: 'Sign up as a Student in a minute - just verify your email and you are in.' },
    { icon: 'event_available', title: 'Enrol in a class', desc: 'Browse classes by subject, check the seats left, and enrol with one click.' },
    { icon: 'military_tech', title: 'Learn and earn badges', desc: 'Submit coursework, track your grades and attendance, and collect badges from your teachers.' }
];

// The same four facts AboutPage.jsx leads with under "What Sets Us Apart" - reused here rather
// than re-invented, so a Student sees one consistent story about the platform regardless of
// which page told them.
const facilities = [
    { icon: 'school', title: 'Expert Educators', desc: 'Every teacher is reviewed and approved by an Administrator before they can take a class, so you always learn from a verified subject expert.' },
    { icon: 'touch_app', title: 'Frictionless Learning', desc: 'One unified dashboard to browse course categories, enrol in classes, and pick up right where you left off.' },
    { icon: 'military_tech', title: 'Gamified Progress', desc: 'Digital badges and recognition for hard work, so your progress is something you can actually see.' },
    { icon: 'bar_chart', title: 'Data-Driven Success', desc: 'Progress cards and grading analytics that make academic growth visible in real time.' }
];

// Shared by both the Student and Teacher home views - the identity/mission pitch, distinct from
// the Facilities grid below (which is Student-only, since it's about what a Student *does* on
// the platform day to day).
const AboutSection = () => (
    <section className="py-24 px-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
        <div className="max-w-4xl mx-auto text-center" data-aos="fade-up">
            <div className="inline-block mb-6 px-5 py-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-600 dark:text-slate-300 text-sm font-bold tracking-widest uppercase shadow-sm border border-slate-200 dark:border-slate-700">
                About A1 Academy
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-slate-900 dark:text-white leading-tight">
                Scholarly Excellence, <span className="text-amber-500">Built for Everyone</span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium">
                At A1 Academy, we believe quality education should be accessible, engaging, and measurable.
                We bridge the gap between ambitious students and verified, top-tier educators - building
                personalized learning pathways instead of one-size-fits-all classes.
            </p>
        </div>
    </section>
);

// The interactive subject browser - real categories as labelled tabs, one detail card. Shared by the
// public landing page and the Student home view; only the heading/copy and the call to action differ.
const CoursesSection = ({ heading, body, cta }) => {
    const [subjects, setSubjects] = useState(fallbackSubjects);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch(`${import.meta.env.VITE_API_URL}/api/categories/public`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!cancelled && Array.isArray(data) && data.length > 0) setSubjects(data.slice(0, 6));
            })
            .catch(() => { /* keep the fallback subjects */ });
        return () => { cancelled = true; };
    }, []);

    const selectSubject = (index) => {
        if (index === activeIndex || isAnimating) return;
        setIsAnimating(true);
        setTimeout(() => {
            setActiveIndex(index);
            setIsAnimating(false);
        }, 200);
    };

    const active = subjects[activeIndex] || subjects[0];

    return (
        <section className="py-24 md:py-32 relative bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div data-aos="fade-up">
                        <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-slate-900 dark:text-white leading-tight">{heading}</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg mb-8 leading-relaxed">{body}</p>
                        <div className="flex flex-wrap gap-3" aria-label="Subjects">
                            {subjects.map((subject, idx) => (
                                <button
                                    type="button"
                                    key={subject.id}
                                    onClick={() => selectSubject(idx)}
                                    aria-pressed={activeIndex === idx}
                                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-colors cursor-pointer ${activeIndex === idx ? 'bg-amber-300 text-slate-900 shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-amber-100 dark:hover:bg-slate-700'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{iconFor(subject.name)}</span>
                                    {subject.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative mx-2 sm:mx-4 lg:mx-0" data-aos="fade-up" data-aos-delay="100">
                        <div className="absolute inset-0 bg-amber-100 dark:bg-amber-900/30 rounded-[40px] rotate-3 scale-105 transition-transform duration-500 hover:rotate-6"></div>
                        <div
                            className={`relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-6 sm:p-10 rounded-[40px] shadow-2xl group border border-slate-100 dark:border-slate-700 transition-all duration-200 ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
                        >
                            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 text-amber-600 dark:text-amber-300">
                                <span className="material-symbols-outlined text-5xl" aria-hidden="true">{iconFor(active.name)}</span>
                            </div>
                            <h3 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">{active.name}</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                                {active.description || 'Classes taught by verified subject experts.'}
                            </p>
                            {cta}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const HowItWorksSection = () => (
    <section className="py-24 px-4 sm:px-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16" data-aos="fade-up">
                <div className="inline-block mb-4 px-5 py-2 rounded-full bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 text-sm font-bold tracking-widest uppercase shadow-sm border border-slate-200 dark:border-slate-700">
                    How It Works
                </div>
                <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight">
                    Start learning in <span className="text-amber-500">three steps</span>
                </h2>
            </div>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {steps.map((step, i) => (
                    <li key={step.title} className="relative bg-white dark:bg-slate-900 rounded-[24px] p-6 sm:p-8 border border-slate-100 dark:border-slate-700 shadow-sm" data-aos="fade-up" data-aos-delay={i * 100}>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-3xl" aria-hidden="true">{step.icon}</span>
                            </div>
                            <span className="text-5xl font-black text-slate-200 dark:text-slate-700 leading-none" aria-hidden="true">{i + 1}</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                    </li>
                ))}
            </ol>
        </div>
    </section>
);

// The three most recent badges from the public Recognition Board. Hidden entirely if there are
// none (or the API is unreachable) rather than showing an empty box on the landing page.
const RecognitionPreview = () => {
    const [badges, setBadges] = useState([]);

    useEffect(() => {
        let cancelled = false;
        fetch(`${import.meta.env.VITE_API_URL}/api/recognition/board`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (cancelled || !Array.isArray(data)) return;
                const newest = [...data].sort((a, b) => new Date(b.awardedAt) - new Date(a.awardedAt));
                setBadges(newest.slice(0, 3));
            })
            .catch(() => { /* leave the section hidden */ });
        return () => { cancelled = true; };
    }, []);

    if (badges.length === 0) return null;

    return (
        <section className="py-24 px-4 sm:px-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12" data-aos="fade-up">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight">
                            Recently <span className="text-amber-500">Recognised</span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg mt-3">Badges our teachers have awarded for outstanding work.</p>
                    </div>
                    <Link to="/recognition" className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 hover:gap-2 transition-all shrink-0">
                        See the full board <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_forward</span>
                    </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {badges.map((badge, i) => {
                        const color = badge.badgeColor || '#f59e0b';
                        return (
                            <div key={badge.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm" data-aos="fade-up" data-aos-delay={i * 100}>
                                <div className="flex items-center gap-4 mb-4 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                                        <span className="material-symbols-outlined text-2xl" aria-hidden="true">{badge.badgeIcon || 'military_tech'}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-white">{badge.badgeName}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(badge.awardedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{badge.studentName}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Awarded by {badge.teacherName}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

const TeachBanner = ({ onApply }) => (
    <section className="px-4 sm:px-6 py-20 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto rounded-[32px] bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 px-6 py-12 sm:px-12 sm:py-16 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 relative overflow-hidden" data-aos="fade-up">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-amber-400/20 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="relative max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-4">
                    Share your expertise. <span className="text-amber-400">Teach at A1 Academy.</span>
                </h2>
                <p className="text-slate-300 text-lg leading-relaxed">
                    Apply with your qualifications - once an Administrator verifies you, you can schedule classes,
                    share materials, grade coursework, and award badges to your students.
                </p>
            </div>
            <button
                type="button"
                onClick={onApply}
                className="relative shrink-0 self-start lg:self-auto bg-amber-400 hover:bg-amber-300 text-slate-900 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:-translate-y-1 cursor-pointer"
            >
                Apply to Teach
            </button>
        </div>
    </section>
);

export default function IndexPage() {
    const [role] = useState(() => localStorage.getItem('role'));
    const openModal = (id) => window.openReactModal && window.openReactModal(id);

    // ---------- Logged in as Student: courses, About, and Facilities ----------
    if (role === 'Student') {
        return (
            <Layout>
                <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-amber-200 dark:bg-amber-900/40 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-[pulse_6s_ease-in-out_infinite] pointer-events-none"></div>
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200 dark:bg-blue-900/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-[pulse_6s_ease-in-out_infinite_3s] pointer-events-none"></div>

                    <div className="relative z-10 text-center px-4 max-w-4xl mx-auto" data-aos="zoom-in" data-aos-duration="1000">
                        <div className="inline-block mb-6 px-5 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-600 dark:text-slate-300 text-sm font-bold tracking-widest uppercase shadow-sm border border-slate-200 dark:border-slate-700">
                            Welcome Back
                        </div>
                        <h1 className="text-6xl md:text-7xl font-black mb-8 leading-tight tracking-tight text-slate-900 dark:text-white">
                            Continue Your <span className="text-amber-500">Learning Journey</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                            Browse more courses, keep an eye on the categories you're enrolled in, and pick up right where you left off.
                        </p>
                        <Link to="/student/categories" className="inline-block bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 px-5 sm:px-8 py-4 rounded-full font-bold text-lg hover:-translate-y-1 transition-all shadow-xl hover:shadow-2xl hover:bg-slate-800 dark:hover:bg-amber-300">
                            Browse Courses
                        </Link>
                    </div>
                </section>

                <CoursesSection
                    heading={<>Other Courses <br /> Worth Exploring</>}
                    body="Every course is grouped by subject, so finding the next one to enrol in is always a click away."
                    cta={
                        <Link to="/classes" className="inline-flex items-center gap-2 bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 px-6 py-3 rounded-full font-bold hover:bg-slate-800 dark:hover:bg-amber-300 transition-colors">
                            Browse classes <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_forward</span>
                        </Link>
                    }
                />

                <AboutSection />

                <section className="py-24 px-6 max-w-7xl mx-auto bg-white dark:bg-slate-900">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white text-center mb-4" data-aos="fade-up">
                        Facilities at A1 Academy
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-center max-w-2xl mx-auto mb-16" data-aos="fade-up">
                        Everything built into your account to make learning here easier.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {facilities.map((card, i) => (
                            <div key={i} className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-[24px] p-5 sm:p-8 shadow-xl border border-slate-100 dark:border-slate-700 hover:-translate-y-2 transition-all duration-300 group" data-aos="fade-up" data-aos-delay={i * 100}>
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-6 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 transition-colors">
                                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-300 text-3xl transition-colors">
                                        {card.icon}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{card.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{card.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </Layout>
        );
    }

    // ---------- Logged in as Teacher: About only ----------
    if (role === 'Teacher') {
        return (
            <Layout>
                <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-amber-200 dark:bg-amber-900/40 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-[pulse_6s_ease-in-out_infinite] pointer-events-none"></div>
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200 dark:bg-blue-900/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-[pulse_6s_ease-in-out_infinite_3s] pointer-events-none"></div>

                    <div className="relative z-10 text-center px-4 max-w-4xl mx-auto" data-aos="zoom-in" data-aos-duration="1000">
                        <div className="inline-block mb-6 px-5 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-600 dark:text-slate-300 text-sm font-bold tracking-widest uppercase shadow-sm border border-slate-200 dark:border-slate-700">
                            Welcome Back
                        </div>
                        <h1 className="text-6xl md:text-7xl font-black mb-8 leading-tight tracking-tight text-slate-900 dark:text-white">
                            Thank You for <span className="text-amber-500">Teaching</span> With Us
                        </h1>
                        <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                            You're part of a rigorously vetted community of educators helping students reach their goals.
                        </p>
                        <Link to="/profile" className="inline-block bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 px-5 sm:px-8 py-4 rounded-full font-bold text-lg hover:-translate-y-1 transition-all shadow-xl hover:shadow-2xl hover:bg-slate-800 dark:hover:bg-amber-300">
                            View Your Profile
                        </Link>
                    </div>
                </section>

                <AboutSection />
            </Layout>
        );
    }

    // ---------- Logged out (or Admin, who has their own dedicated pages) - the original public landing page ----------
    return (
        <Layout>
            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900">
                {/* Abstract Shapes */}
                <div className="absolute top-20 left-10 w-72 h-72 bg-amber-200 dark:bg-amber-900/40 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-[pulse_6s_ease-in-out_infinite] pointer-events-none"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200 dark:bg-blue-900/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-[pulse_6s_ease-in-out_infinite_3s] pointer-events-none"></div>

                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto" data-aos="zoom-in" data-aos-duration="1000">
                    <div className="inline-block mb-6 px-5 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-600 dark:text-slate-300 text-sm font-bold tracking-widest uppercase shadow-sm border border-slate-200 dark:border-slate-700">
                        Start Learning Today
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight tracking-tight text-slate-900 dark:text-white">
                        The Future of <br/> <span className="text-amber-500">Education</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                        Create your active account today to start browsing courses, earning digital badges, and shaping your future.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
                        <button onClick={() => openModal('register-student-modal')} className="bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 px-5 sm:px-8 py-4 rounded-full font-bold text-lg hover:-translate-y-1 transition-all shadow-xl hover:shadow-2xl hover:bg-slate-800 dark:hover:bg-amber-300">
                            Join as a Student
                        </button>
                        <button onClick={() => openModal('register-teacher-modal')} className="bg-amber-300 hover:bg-amber-400 text-slate-900 px-5 sm:px-8 py-4 rounded-full font-bold text-lg hover:-translate-y-1 transition-all shadow-lg hover:shadow-xl">
                            Teach with Us
                        </button>
                    </div>
                </div>
            </section>

            <CoursesSection
                heading={<>Interactive & <br /> Engaging Platform</>}
                body="Explore a wide variety of subjects tailored to your goals. Pick a subject to see what you can learn here."
                cta={
                    <button type="button" onClick={() => openModal('register-student-modal')} className="inline-flex items-center gap-2 bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 px-6 py-3 rounded-full font-bold hover:bg-slate-800 dark:hover:bg-amber-300 transition-colors cursor-pointer">
                        Explore classes <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_forward</span>
                    </button>
                }
            />

            <HowItWorksSection />

            <RecognitionPreview />

            <TeachBanner onApply={() => openModal('register-teacher-modal')} />
        </Layout>
    );
}
