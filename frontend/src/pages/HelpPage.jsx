import React from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';

export default function HelpPage() {
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
              <Link to="/terms.html" className="text-slate-500 hover:bg-slate-100 hover:text-slate-900 px-4 py-3 rounded-lg transition-colors font-medium">
                Terms of Service
              </Link>
              <Link to="/help.html" className="font-bold bg-amber-100 text-amber-700 px-4 py-3 rounded-lg transition-colors">
                Help Center
              </Link>
            </nav>
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="col-span-1 md:col-span-3" data-aos="fade-left">
          <div className="bg-white rounded-[32px] p-8 md:p-16 shadow-xl border border-slate-100">
            <header className="mb-12 border-b border-slate-100 pb-12">
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Help Center & Support</h1>
              <p className="text-lg text-slate-500 font-medium">Select your role below to find quick guides on how to navigate the A1 Academy platform.</p>
            </header>

            <div className="space-y-16">
              
              {/* Section 1: Students */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-2 rounded-xl">school</span>
                  For Students
                </h2>
                <ul className="list-disc pl-6 space-y-4 text-slate-600 font-medium leading-relaxed marker:text-amber-500">
                  <li><strong className="text-slate-900">Browsing the Course Catalog:</strong> Navigate to the 'Courses' tab on your dashboard to filter subjects, view detailed teacher profiles, and check active seat availability.</li>
                  <li><strong className="text-slate-900">Enrolling in a Class:</strong> Once you find a desired course, click the 'Enroll' button. If seats are available, your dashboard will instantly update with your new class schedule.</li>
                  <li><strong className="text-slate-900">Submitting Assignments:</strong> Access your specific course dashboard, locate the active assignment module, and upload your PDF or document securely before the displayed deadline.</li>
                </ul>
              </section>

              {/* Section 2: Teachers */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-2 rounded-xl">co_present</span>
                  For Teachers
                </h2>
                <ul className="list-disc pl-6 space-y-4 text-slate-600 font-medium leading-relaxed marker:text-amber-500">
                  <li><strong className="text-slate-900">Setting Seat Capacities:</strong> When creating a new course listing, you must specify the maximum number of students to ensure manageable class sizes. Enrollments will close automatically once the cap is reached.</li>
                  <li><strong className="text-slate-900">Marking Batch Attendance:</strong> Use the 'Attendance' module in your active class to quickly mark your students present, late, or absent for a specific date.</li>
                  <li><strong className="text-slate-900">Awarding Gamified Badges:</strong> Recognize outstanding student performance by issuing digital badges (e.g., "Perfect Attendance" or "Top Scorer") directly from the student's individual progress card view.</li>
                </ul>
              </section>

              {/* Section 3: Admins */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-2 rounded-xl">admin_panel_settings</span>
                  For Administrators
                </h2>
                <ul className="list-disc pl-6 space-y-4 text-slate-600 font-medium leading-relaxed marker:text-amber-500">
                  <li><strong className="text-slate-900">Verifying Pending Teachers:</strong> Access the 'User Management' panel to review the qualifications of newly registered educators and upgrade their status from 'Pending' to 'Active'.</li>
                  <li><strong className="text-slate-900">Managing Badge Templates:</strong> Access the gamification settings to create, edit, or remove the master digital badge designs that are available for teachers to award.</li>
                  <li><strong className="text-slate-900">Generating Growth Reports:</strong> Use the Admin Dashboard analytics tools to export detailed data on student enrollment trends and overall platform growth.</li>
                </ul>
              </section>

              {/* Section 4: Contact Support */}
              <section className="bg-slate-50 border border-slate-100 p-8 rounded-[24px] flex flex-col md:flex-row items-start gap-6">
                <div className="bg-white p-4 rounded-full shadow-sm">
                    <span className="material-symbols-outlined text-slate-400 text-3xl">support_agent</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Still need help?</h2>
                  <p className="text-slate-500 font-medium">
                    Our support team is ready to assist you with any technical issues or account inquiries. Contact us at: <a className="text-amber-600 font-bold hover:underline ml-1" href="mailto:support@a1academy.lk">support@a1academy.lk</a>
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