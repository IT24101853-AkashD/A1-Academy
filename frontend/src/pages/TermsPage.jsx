import React from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-4 gap-12 w-full">
        
        {/* Left Sidebar Navigation */}
        <aside className="col-span-1 md:block hidden">
          <div className="sticky top-32 space-y-2" data-aos="fade-right">
            <h3 className="text-xl font-bold text-slate-900 mb-6 px-4">Legal & Support</h3>
            <nav className="flex flex-col space-y-1">
              <Link to="/privacy.html" className="text-slate-500 hover:bg-slate-100 hover:text-slate-900 px-4 py-3 rounded-lg transition-colors font-medium">
                Privacy Policy
              </Link>
              <Link to="/terms.html" className="font-bold bg-amber-100 text-amber-700 px-4 py-3 rounded-lg transition-colors">
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
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Terms of Service</h1>
              <p className="text-lg text-slate-500 font-medium">Last Updated: August 2026</p>
            </header>

            <div className="space-y-16">
              <p className="text-lg text-slate-600 leading-relaxed">
                Welcome to A1 Academy. By registering an account and accessing our digital tuition platform, you agree to abide by the following rules and regulations.
              </p>

              {/* Section 1 */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-2 rounded-xl">gavel</span>
                  Section 1: Account Roles & Responsibilities
                </h2>
                <p className="text-slate-600 leading-relaxed font-medium mb-4">
                    A1 Academy operates on a strict Role-Based Access Control (RBAC) system. Your capabilities on the platform are determined by your assigned role:
                </p>
                <ul className="list-disc pl-6 space-y-4 text-slate-600 font-medium leading-relaxed marker:text-amber-500">
                  <li><strong className="text-slate-900">Accurate Information:</strong> All users (Students, Teachers, and Administrators) must provide accurate and verifiable information during registration.</li>
                  <li><strong className="text-slate-900">Role Enforcement:</strong> Users must not attempt to bypass the frontend interface or backend API to access dashboards, endpoints, or tools assigned to a different role.</li>
                </ul>
              </section>

              {/* Section 2 */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-2 rounded-xl">verified_user</span>
                  Section 2: Teacher Application & Verification
                </h2>
                <p className="text-slate-600 leading-relaxed font-medium mb-4">
                    To maintain the highest standard of scholarly excellence, all educator applications are subject to manual review.
                </p>
                <ul className="list-disc pl-6 space-y-4 text-slate-600 font-medium leading-relaxed marker:text-amber-500">
                  <li><strong className="text-slate-900">Pending Status:</strong> Upon initial registration, all Teacher accounts are placed in a "Pending" status.</li>
                  <li><strong className="text-slate-900">Restricted Access:</strong> Pending Teachers cannot schedule classes, upload study materials, or interact with students until an Administrator manually verifies their credentials and upgrades their account to "Active".</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-2 rounded-xl">school</span>
                  Section 3: Academic Access & Integrity
                </h2>
                <p className="text-slate-600 leading-relaxed font-medium mb-4">
                    A1 Academy provides premium digital study materials and assignment workflows.
                </p>
                <ul className="list-disc pl-6 space-y-4 text-slate-600 font-medium leading-relaxed marker:text-amber-500">
                  <li><strong className="text-slate-900">Exclusive Access:</strong> Course materials, PDF notes, and assignment submission portals are strictly reserved for students who are officially enrolled in that specific class. Attempting to download materials without an active enrollment is a violation of these terms.</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-2 rounded-xl">block</span>
                  Section 4: Account Deactivation & Enforcement
                </h2>
                <p className="text-slate-600 leading-relaxed font-medium mb-4">
                    Administrators are responsible for maintaining a safe and productive learning environment.
                </p>
                <ul className="list-disc pl-6 space-y-4 text-slate-600 font-medium leading-relaxed marker:text-amber-500">
                  <li><strong className="text-slate-900">Right to Revoke Access:</strong> A1 Academy Administrators reserve the right to change any user's status to "Deactivated" for violating these terms or engaging in disruptive behavior.</li>
                  <li><strong className="text-slate-900">Immediate Termination:</strong> If an account is deactivated, any active platform sessions for that user will be instantly terminated, and all future login attempts will be blocked in real-time.</li>
                </ul>
              </section>

              {/* Section 5: Contact */}
              <section className="bg-slate-50 border border-slate-100 p-8 rounded-[24px] flex flex-col md:flex-row items-start gap-6">
                <div className="bg-white p-4 rounded-full shadow-sm">
                    <span className="material-symbols-outlined text-slate-400 text-3xl">mail</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Section 5: Contact Us</h2>
                  <p className="text-slate-500 font-medium">
                    If you have any questions regarding these terms, please reach out to our administration at: <a className="text-amber-600 font-bold hover:underline ml-1" href="mailto:support@a1academy.lk">support@a1academy.lk</a>
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