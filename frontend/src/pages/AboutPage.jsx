import React from 'react';
import Layout from '../components/Layout';

export default function AboutPage() {
  return (
    <Layout>
      <section className="py-32 px-6 text-center max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]" data-aos="fade-up">
        <div className="inline-block mb-6 px-5 py-2 rounded-full bg-white/80 backdrop-blur-md text-slate-600 text-sm font-bold tracking-widest uppercase shadow-sm border border-slate-200">
          About Us
        </div>
        <h1 className="text-5xl md:text-6xl font-black mb-6 text-slate-900">
          Empowering the Next <br/> <span className="text-amber-500">Generation of Scholars</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-500 max-w-3xl leading-relaxed font-medium">
          At A1 Academy, we believe that quality education should be accessible, engaging, and measurable. Founded on the principle of scholarly excellence, our platform bridges the gap between ambitious students and verified, top-tier educators. We do not just facilitate classes; we build personalized learning pathways designed to elevate every student's academic journey.
        </p>
      </section>

      <section className="py-24 px-6 max-w-7xl mx-auto bg-slate-50">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 text-center mb-16" data-aos="fade-up">
          What Sets Us Apart
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[ 
            { icon: 'school', title: 'Expert Educators', desc: 'A rigorously vetted community of teachers, providing expert guidance across Mathematics, Science, Computing, and Languages.' },
            { icon: 'touch_app', title: 'Frictionless Learning', desc: 'An intuitive, unified dashboard where students can seamlessly browse course catalogs, enroll in classes, and access premium digital study materials.' },
            { icon: 'military_tech', title: 'Gamified Progress', desc: 'We believe in rewarding hard work. Our integrated digital badge system and public recognition boards keep students motivated and engaged.' },
            { icon: 'bar_chart', title: 'Data-Driven Success', desc: 'With dynamic progress cards and detailed grading analytics, students and teachers can visualize academic growth in real-time.' }
          ].map((card, i) => (
            <div key={i} className="bg-white/90 backdrop-blur-md rounded-[24px] p-8 shadow-xl border border-slate-100 hover:-translate-y-2 transition-all duration-300 group" data-aos="fade-up" data-aos-delay={i * 100}>
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-6 group-hover:bg-amber-100 transition-colors">
                <span className="material-symbols-outlined text-slate-600 group-hover:text-amber-600 text-3xl transition-colors">
                  {card.icon}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                {card.title}
              </h3>
              <p className="text-slate-500 leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full py-24 px-6 mt-12 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto text-center" data-aos="zoom-in">
          <h2 className="text-slate-400 mb-8 uppercase tracking-widest text-sm font-bold">
            The Vision
          </h2>
          <blockquote className="text-3xl md:text-4xl font-extrabold text-slate-900 italic leading-relaxed relative">
            <span className="material-symbols-outlined absolute -top-10 -left-6 md:-left-12 text-amber-200 text-8xl -z-10">
              format_quote
            </span>
            "To be the premier digital tuition hub where administrative friction is eliminated, allowing teachers to focus purely on teaching and students to focus purely on learning."
          </blockquote>
        </div>
      </section>
    </Layout>
  );
}