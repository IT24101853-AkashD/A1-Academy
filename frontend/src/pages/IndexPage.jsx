import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const cardData = [
    { icon: 'calculate', title: 'Mathematics', desc: 'Master algebra, calculus, geometry and statistics with expert guidance.' },
    { icon: 'science', title: 'Science', desc: 'Discover the wonders of physics, chemistry, and biology subjects.' },
    { icon: 'computer', title: 'Computing', desc: 'Learn coding, data structures, algorithms, and artificial intelligence.' },
    { icon: 'language', title: 'Languages', desc: 'Achieve fluency in new languages through immersive learning.' }
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

export default function IndexPage() {
    const [role] = useState(() => localStorage.getItem('role'));
    const [activeIndex, setActiveIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleCardClick = (index) => {
        if (index === activeIndex || isAnimating) return;

        setIsAnimating(true);
        setTimeout(() => {
            setActiveIndex(index);
            setIsAnimating(false);
        }, 200);
    };

    const activeCard = cardData[activeIndex];

    // The interactive course browser - identical card-flip behavior whether it's pitching
    // courses to a visitor or letting an already-enrolled Student browse more of them, just a
    // different heading/copy either side of it (see callers below).
    const CoursesSection = ({ heading, body }) => (
        <section className="py-32 relative bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div data-aos="fade-right">
                        <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-slate-900 dark:text-white leading-tight">{heading}</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg mb-8 leading-relaxed">{body}</p>
                        <div className="flex gap-4">
                            {[0, 1, 2, 3].map((idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleCardClick(idx)}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-colors cursor-pointer ${activeIndex === idx ? 'bg-amber-300 text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-amber-200'}`}
                                >
                                    {idx + 1}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative" data-aos="fade-left">
                        <div className="absolute inset-0 bg-amber-100 dark:bg-amber-900/30 rounded-[40px] rotate-3 scale-105 transition-transform duration-500 hover:rotate-6"></div>
                        <div
                            className={`relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-10 rounded-[40px] shadow-2xl group cursor-pointer border border-slate-100 dark:border-slate-700 transition-all duration-200 ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
                        >
                            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 text-amber-600 dark:text-amber-300">
                                <span className="material-symbols-outlined text-5xl">{activeCard.icon}</span>
                            </div>
                            <h3 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">{activeCard.title}</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-6">{activeCard.desc}</p>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400 w-2/3 rounded-full relative group-hover:w-full transition-all duration-1000">
                                    <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );

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
                        <Link to="/student/categories" className="inline-block bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 px-8 py-4 rounded-full font-bold text-lg hover:-translate-y-1 transition-all shadow-xl hover:shadow-2xl hover:bg-slate-800 dark:hover:bg-amber-300">
                            Browse Courses
                        </Link>
                    </div>
                </section>

                <CoursesSection
                    heading={<>Other Courses <br /> Worth Exploring</>}
                    body="Every course is grouped by subject, so finding the next one to enrol in is always a click away."
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
                            <div key={i} className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-[24px] p-8 shadow-xl border border-slate-100 dark:border-slate-700 hover:-translate-y-2 transition-all duration-300 group" data-aos="fade-up" data-aos-delay={i * 100}>
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
                        <Link to="/profile" className="inline-block bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 px-8 py-4 rounded-full font-bold text-lg hover:-translate-y-1 transition-all shadow-xl hover:shadow-2xl hover:bg-slate-800 dark:hover:bg-amber-300">
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
                        <button onClick={() => window.openReactModal && window.openReactModal('register-student-modal')} className="bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 px-8 py-4 rounded-full font-bold text-lg hover:-translate-y-1 transition-all shadow-xl hover:shadow-2xl hover:bg-slate-800 dark:hover:bg-amber-300">
                            Join as a Student
                        </button>
                        <button onClick={() => window.openReactModal && window.openReactModal('register-teacher-modal')} className="bg-amber-300 hover:bg-amber-400 text-slate-900 px-8 py-4 rounded-full font-bold text-lg hover:-translate-y-1 transition-all shadow-lg hover:shadow-xl">
                            Teach with Us
                        </button>
                    </div>
                </div>
            </section>

            <CoursesSection
                heading={<>Interactive & <br /> Engaging Platform</>}
                body="Explore a wide variety of subjects tailored to your goals. Our curriculum is designed to be engaging, comprehensive, and easy to follow."
            />
        </Layout>
    );
}
