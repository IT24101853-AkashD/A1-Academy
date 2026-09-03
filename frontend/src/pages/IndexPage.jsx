import React, { useState } from 'react';
import Layout from '../components/Layout';

const cardData = [
    { icon: 'calculate', title: 'Mathematics', desc: 'Master algebra, calculus, geometry and statistics with expert guidance.' },
    { icon: 'science', title: 'Science', desc: 'Discover the wonders of physics, chemistry, and biology subjects.' },
    { icon: 'computer', title: 'Computing', desc: 'Learn coding, data structures, algorithms, and artificial intelligence.' },
    { icon: 'language', title: 'Languages', desc: 'Achieve fluency in new languages through immersive learning.' }
];

export default function IndexPage() {
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

    return (
        <Layout>
            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-slate-50">
                {/* Abstract Shapes */}
                <div className="absolute top-20 left-10 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-[pulse_6s_ease-in-out_infinite] pointer-events-none"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-[pulse_6s_ease-in-out_infinite_3s] pointer-events-none"></div>
                
                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto" data-aos="zoom-in" data-aos-duration="1000">
                    <div className="inline-block mb-6 px-5 py-2 rounded-full bg-white/80 backdrop-blur-md text-slate-600 text-sm font-bold tracking-widest uppercase shadow-sm border border-slate-200">
                        Start Learning Today
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight tracking-tight text-slate-900">
                        The Future of <br/> <span className="text-amber-500">Education</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                        Create your active account today to start browsing courses, earning digital badges, and shaping your future.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
                        <button onClick={() => window.openReactModal && window.openReactModal('register-student-modal')} className="bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-lg hover:-translate-y-1 transition-all shadow-xl hover:shadow-2xl hover:bg-slate-800">
                            Join as a Student
                        </button>
                        <button onClick={() => window.openReactModal && window.openReactModal('register-teacher-modal')} className="bg-amber-300 hover:bg-amber-400 text-slate-900 px-8 py-4 rounded-full font-bold text-lg hover:-translate-y-1 transition-all shadow-lg hover:shadow-xl">
                            Teach with Us
                        </button>
                    </div>
                </div>
            </section>

            {/* Interactive Cards Section */}
            <section className="py-32 relative bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div data-aos="fade-right">
                            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-slate-900 leading-tight">Interactive & <br/> Engaging Platform</h2>
                            <p className="text-slate-500 text-lg mb-8 leading-relaxed">
                                Explore a wide variety of subjects tailored to your goals. Our curriculum is designed to be engaging, comprehensive, and easy to follow.
                            </p>
                            <div className="flex gap-4">
                                {[0, 1, 2, 3].map((idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => handleCardClick(idx)}
                                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-colors cursor-pointer ${activeIndex === idx ? 'bg-amber-300 text-slate-900' : 'bg-slate-100 text-slate-900 hover:bg-amber-200'}`}
                                    >
                                        {idx + 1}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="relative" data-aos="fade-left">
                            <div className="absolute inset-0 bg-amber-100 rounded-[40px] rotate-3 scale-105 transition-transform duration-500 hover:rotate-6"></div>
                            <div 
                                className={`relative bg-white/90 backdrop-blur-md p-10 rounded-[40px] shadow-2xl group cursor-pointer border border-slate-100 transition-all duration-200 ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
                            >
                                <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 text-amber-600">
                                    <span className="material-symbols-outlined text-5xl">{activeCard.icon}</span>
                                </div>
                                <h3 className="text-3xl font-bold mb-4 text-slate-900">{activeCard.title}</h3>
                                <p className="text-slate-500 mb-6">{activeCard.desc}</p>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-400 w-2/3 rounded-full relative group-hover:w-full transition-all duration-1000">
                                        <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
}