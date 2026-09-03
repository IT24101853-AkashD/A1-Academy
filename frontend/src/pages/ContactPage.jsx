import React from 'react';
import Layout from '../components/Layout';

export default function ContactPage() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative w-full min-h-[40vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden bg-slate-900">
        <img className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay" src="https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=2000&auto=format&fit=crop" alt="Modern educational building exterior" />
        <div className="relative z-10 flex flex-col items-center" data-aos="fade-up">
            <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-sm font-bold tracking-widest uppercase border border-amber-500/30">
              Contact Us
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6">
              Get in Touch with <span className="text-amber-500">A1 Academy</span>
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl font-medium">
                Whether you are a student, a teacher, or an administrator, our team is here to help.
            </p>
        </div>
      </section>

      {/* Contact Information Cards */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 -mt-16 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[ 
            { icon: 'location_on', title: 'Headquarters', desc: '15 Education Mawatha, Nuwara Eliya, Sri Lanka' },
            { icon: 'mail', title: 'Email Support', desc: 'support@a1academy.lk' },
            { icon: 'call', title: 'Phone', desc: '+94 77 123 4567' },
            { icon: 'schedule', title: 'Working Hours', desc: 'Monday – Saturday, 8:00 AM to 6:00 PM (LKT)' }
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-[24px] p-8 shadow-xl border border-slate-100 hover:-translate-y-2 transition-all duration-300 group flex flex-col items-center text-center" data-aos="fade-up" data-aos-delay={i * 100}>
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-6 group-hover:bg-amber-100 transition-colors shadow-sm">
                <span className="material-symbols-outlined text-slate-400 text-3xl group-hover:text-amber-600 transition-colors">
                  {card.icon}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{card.title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 py-24 bg-slate-50 rounded-3xl mb-24">
        <div className="text-center mb-16" data-aos="fade-up">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <p className="text-lg text-slate-500 font-medium">Find quick answers to common questions about A1 Academy.</p>
        </div>
        
        <div className="space-y-6">
          {[ 
            { q: 'How do I enroll in a class?', a: 'Simply register for a free Student account. Once logged in, you can browse our Course Catalog by subject, view available seats, and instantly enroll in any active class.' },
            { q: 'How do I apply to become a teacher?', a: 'Click the "Register" button and select the Teacher role. Your account will be placed in a "Pending" status while our Administrators review your professional qualifications. Once approved, you can begin scheduling classes.' },
            { q: 'How does the digital badge system work?', a: 'Our gamified learning system allows teachers to award digital badges for excellent academic performance, perfect attendance, and class participation. These badges are permanently displayed on your student progress card.' }
          ].map((faq, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow" data-aos="fade-up" data-aos-delay={i * 100}>
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                <span className="text-amber-500">Q.</span> {faq.q}
              </h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Location Map Section */}
      <section className="w-full bg-white py-24 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div data-aos="fade-right">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">Visit Our Campus</h2>
            <p className="text-lg text-slate-500 leading-relaxed font-medium mb-8">
              A1 Academy is proudly headquartered in the serene, focused environment of Nuwara Eliya. While our digital platform connects students globally, our administrative and support teams operate from our central campus.
            </p>
            <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-amber-600">directions_car</span>
              </div>
              <span className="text-slate-700 font-bold">
                Free parking available for all registered students and faculty.
              </span>
            </div>
          </div>
          {/* Map Image */}
          <div className="w-full h-[400px] bg-slate-100 rounded-[32px] overflow-hidden shadow-2xl border-8 border-white relative" data-aos="fade-left">
            <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1000&auto=format&fit=crop" alt="Map of Nuwara Eliya Headquarters" className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-slate-900 text-white p-4 rounded-full shadow-2xl flex items-center justify-center animate-bounce border-4 border-white">
                    <span className="material-symbols-outlined text-3xl text-amber-400">pin_drop</span>
                </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}