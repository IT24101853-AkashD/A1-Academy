import React from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-4 gap-12 w-full">
        
        {/* Left Sidebar Navigation */}
        <aside className="col-span-1 md:block hidden">
          <div className="sticky top-32 space-y-2" data-aos="fade-right">
            <h3 className="text-xl font-bold text-slate-900 mb-6 px-4">Legal & Support</h3>
            <nav className="flex flex-col space-y-1">
              <Link to="/privacy.html" className="font-bold bg-amber-100 text-amber-700 px-4 py-3 rounded-lg transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms.html" className="text-slate-500 hover:bg-slate-100 hover:text-slate-900 px-4 py-3 rounded-lg transition-colors font-medium">
                Terms of Service
              </Link>
              <Link to="/help.html" className="text-slate-500 hover:bg-slate-100 hover:text-slate-900 px-4 py-3 rounded-lg transition-colors font-medium">
                Help Center
              </Link>
            </nav>
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="col-span-1 md:col-span-3" data-aos="fade-left">
          <div className="bg-white rounded-[32px] p-8 md:p-16 shadow-xl border border-slate-100">
            <header className="mb-12 border-b border-slate-100 pb-12">
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Privacy Policy</h1>
              <p className="text-lg text-slate-500 font-medium">Last Updated: August 2026</p>
            </header>

            <div className="space-y-16">
              <p className="text-lg text-slate-600 leading-relaxed">
                At A1 Academy, we are committed to protecting the privacy and security of our students, teachers, and administrators. This policy outlines our practices concerning the collection, use, and safeguarding of personal information.
              </p>

              {/* Section 1: Data Collection */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-2 rounded-xl">database</span>
                  Section 1: Data Collection
                </h2>
                <ul className="list-disc pl-6 space-y-4 text-slate-600 font-medium leading-relaxed marker:text-amber-500">
                  <li><strong className="text-slate-900">Students:</strong> We collect necessary academic records, progress metrics, and basic contact information required for enrollment and educational support.</li>
                  <li><strong className="text-slate-900">Teachers:</strong> We collect professional credentials, scheduling preferences, and performance evaluations to facilitate effective course management.</li>
                </ul>
              </section>

              {/* Section 2: Data Security */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-2 rounded-xl">security</span>
                  Section 2: Data Security & Authentication
                </h2>
                <ul className="list-disc pl-6 space-y-4 text-slate-600 font-medium leading-relaxed marker:text-amber-500">
                  <li><strong className="text-slate-900">Secure Credentials:</strong> All user passwords are cryptographically hashed and salted before storage. Multi-factor authentication (MFA) is mandated for administrative roles.</li>
                  <li><strong className="text-slate-900">Session Protection:</strong> Active sessions are monitored and automatically timed out after periods of inactivity to prevent unauthorized access.</li>
                </ul>
              </section>

              {/* Section 3: Role-Based Data */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-2 rounded-xl">policy</span>
                  Section 3: Role-Based Data Isolation
                </h2>
                <ul className="list-disc pl-6 space-y-4 text-slate-600 font-medium leading-relaxed marker:text-amber-500">
                  <li><strong className="text-slate-900">Academic Privacy:</strong> Student grades and feedback are strictly isolated and only accessible to the assigned teacher, the student, and authorized administrators.</li>
                  <li><strong className="text-slate-900">Cross-User Protection:</strong> Teachers cannot access the personal information or academic records of students not enrolled in their current or past courses.</li>
                </ul>
              </section>

              {/* Section 4: Contact */}
              <section className="bg-slate-50 border border-slate-100 p-8 rounded-[24px] flex flex-col md:flex-row items-start gap-6">
                <div className="bg-white p-4 rounded-full shadow-sm">
                    <span className="material-symbols-outlined text-slate-400 text-3xl">mail</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Section 4: Contact Us</h2>
                  <p className="text-slate-500 font-medium">
                    If you have any questions or concerns regarding this Privacy Policy, please contact our support team at: <a className="text-amber-600 font-bold hover:underline ml-1" href="mailto:support@a1academy.lk">support@a1academy.lk</a>
                  </p>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}