import React from 'react';

export default function HelpPage() {
  return (
    <>
      

{/*  PERFECTED HOMEPAGE HEADER  */}
<header className="bg-surface dark:bg-on-background shadow-sm sticky top-0 z-50 w-full transition-colors duration-300">
<div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-base max-w-max-width mx-auto">
<div className="flex items-center gap-md">
<a className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg font-bold text-primary dark:text-primary-fixed-dim" href="index.html">A1 Academy</a>
<nav className="hidden md:flex items-center gap-gutter ml-lg font-body-md text-body-md">
<a className="text-on-surface-variant dark:text-surface-variant hover:text-primary hover:bg-surface-container-low dark:hover:bg-primary-container transition-colors active:scale-95 transition-transform px-3 py-2 rounded-md" href="#">Courses</a>
<a className="text-on-surface-variant dark:text-surface-variant hover:text-primary hover:bg-surface-container-low dark:hover:bg-primary-container transition-colors active:scale-95 transition-transform px-3 py-2 rounded-md" href="#">Teachers</a>
</nav>
</div>
<div className="flex items-center gap-md">
<div className="hidden lg:flex items-center bg-surface-container-low rounded-full px-4 py-2 border border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
<span className="material-symbols-outlined text-on-surface-variant mr-2">search</span>
<input className="bg-transparent border-none focus:ring-0 text-body-md w-48 outline-none" placeholder="Search courses..." type="text"/>
</div>
<div className="hidden sm:flex items-center gap-2">
<a className="inline-flex justify-center items-center w-28 border-2 border-outline-variant text-primary font-label-md text-label-md py-2 rounded-full hover:bg-secondary-container hover:text-on-secondary-container hover:border-primary active:scale-95 transition-all cursor-pointer" onClick={() => { window.openReactModal('register-modal') }}>Register</a>
{/*  Swapped Login Button: Fixed width (w-28) to exactly match Register button  */}
<a className="inline-flex justify-center items-center w-28 border-2 border-primary bg-primary text-on-primary font-label-md text-label-md py-2 rounded-full hover:bg-primary-container hover:border-primary-container active:scale-95 transition-all shadow-sm cursor-pointer" onClick={() => { window.openReactModal('login-modal') }}>Login</a>
</div>
<button className="md:hidden text-primary">
<span className="material-symbols-outlined text-[28px]">menu</span>
</button>
</div>
</div>
</header>

{/*  HELP CENTER MAIN CONTENT  */}
<main className="flex-grow bg-surface w-full">
<div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-xl grid grid-cols-1 md:grid-cols-4 gap-gutter">

{/*  Left Sidebar Navigation  */}
<aside className="col-span-1 md:block hidden">
<div className="sticky top-32 space-y-4">
<h3 className="font-headline-sm text-headline-sm text-primary mb-6">Legal & Support</h3>
<nav className="flex flex-col space-y-2">
{/*  Inactive  */}
<a className="text-on-surface-variant hover:bg-surface-container-low hover:text-primary px-4 py-3 border-l-4 border-transparent transition-colors rounded-r-md" href="privacy.html">Privacy Policy</a>
{/*  Inactive  */}
<a className="text-on-surface-variant hover:bg-surface-container-low hover:text-primary px-4 py-3 border-l-4 border-transparent transition-colors rounded-r-md" href="terms.html">Terms of Service</a>
{/*  Active  */}
<a className="font-bold border-l-4 border-primary bg-surface-container-low text-primary px-4 py-3 rounded-r-md transition-colors" href="help.html">Help Center</a>
</nav>
</div>
</aside>

{/*  Right Content Area  */}
<div className="col-span-1 md:col-span-3">
<div className="bg-surface-container-lowest rounded-[16px] p-6 md:p-12 shadow-level-1 border border-surface-variant">
<header className="mb-8 border-b border-surface-variant pb-8">
<h1 className="font-headline-md text-headline-md text-primary mb-2">Help Center & Support</h1>
<p className="text-on-surface-variant font-body-lg">Select your role below to find quick guides on how to navigate the A1 Academy platform.</p>
</header>

<div className="space-y-8 font-body-md text-body-md text-on-surface">

{/*  Section 1: Students  */}
<section>
<h2 className="font-headline-sm text-headline-sm text-primary mb-4 flex items-center gap-2">
<span className="material-symbols-outlined text-primary" data-icon="school">school</span>
    For Students
</h2>
<ul className="list-disc pl-6 space-y-4 text-on-surface-variant marker:text-primary">
    <li><strong>Browsing the Course Catalog:</strong> Navigate to the 'Courses' tab on your dashboard to filter subjects, view detailed teacher profiles, and check active seat availability.</li>
    <li><strong>Enrolling in a Class:</strong> Once you find a desired course, click the 'Enroll' button. If seats are available, your dashboard will instantly update with your new class schedule.</li>
    <li><strong>Submitting Assignments:</strong> Access your specific course dashboard, locate the active assignment module, and upload your PDF or document securely before the displayed deadline.</li>
</ul>
</section>

{/*  Section 2: Teachers  */}
<section>
<h2 className="font-headline-sm text-headline-sm text-primary mb-4 flex items-center gap-2">
<span className="material-symbols-outlined text-primary" data-icon="co_present">co_present</span>
    For Teachers
</h2>
<ul className="list-disc pl-6 space-y-4 text-on-surface-variant marker:text-primary">
    <li><strong>Setting Seat Capacities:</strong> When creating a new course listing, you must specify the maximum number of students to ensure manageable class sizes. Enrollments will close automatically once the cap is reached.</li>
    <li><strong>Marking Batch Attendance:</strong> Use the 'Attendance' module in your active class to quickly mark your students present, late, or absent for a specific date.</li>
    <li><strong>Awarding Gamified Badges:</strong> Recognize outstanding student performance by issuing digital badges (e.g., "Perfect Attendance" or "Top Scorer") directly from the student's individual progress card view.</li>
</ul>
</section>

{/*  Section 3: Admins  */}
<section>
<h2 className="font-headline-sm text-headline-sm text-primary mb-4 flex items-center gap-2">
<span className="material-symbols-outlined text-primary" data-icon="admin_panel_settings">admin_panel_settings</span>
    For Administrators
</h2>
<ul className="list-disc pl-6 space-y-4 text-on-surface-variant marker:text-primary">
    <li><strong>Verifying Pending Teachers:</strong> Access the 'User Management' panel to review the qualifications of newly registered educators and upgrade their status from 'Pending' to 'Active'.</li>
    <li><strong>Managing Badge Templates:</strong> Access the gamification settings to create, edit, or remove the master digital badge designs that are available for teachers to award.</li>
    <li><strong>Generating Growth Reports:</strong> Use the Admin Dashboard analytics tools to export detailed data on student enrollment trends and overall platform growth.</li>
</ul>
</section>

{/*  Section 4: Contact Support  */}
<section className="bg-surface-container-low p-6 rounded-lg mt-12 flex items-start gap-4">
<span className="material-symbols-outlined text-primary text-[32px] mt-1" data-icon="support_agent">support_agent</span>
<div>
    <h2 className="font-headline-sm text-[20px] text-primary mb-1">Still need help?</h2>
    <p className="text-on-surface-variant">Our support team is ready to assist you with any technical issues or account inquiries. Contact us at: <a className="text-secondary font-bold hover:underline" href="mailto:support@a1academy.lk">support@a1academy.lk</a></p>
</div>
</section>

</div>
</div>
</div>
</div>
</main>

{/*  PERFECTED HOMEPAGE FOOTER  */}
<footer className="bg-primary dark:bg-on-tertiary-fixed text-on-primary dark:text-tertiary-fixed font-label-md text-label-md mt-auto">
<div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-margin-mobile md:px-margin-desktop py-xl max-w-max-width mx-auto">
<div className="col-span-1 md:col-span-1">
<h3 className="font-headline-sm text-headline-sm text-surface-bright mb-md">A1 Academy</h3>
<p className="text-primary-fixed-dim opacity-80 mt-2 max-w-xs font-body-md text-body-md">
                    Scholarly excellence for the modern age. Connecting dedicated students with verified expert educators.
                </p>
</div>
<div className="col-span-1 md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-lg">
<div>
<h4 className="text-surface-bright font-semibold mb-sm">Platform</h4>
<ul className="space-y-sm">
<li className=""><a className="text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-surface-bright transition-opacity focus:outline-none  rounded" href="#">Courses</a></li>
<li className=""><a className="text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-surface-bright transition-opacity focus:outline-none  rounded" href="#">Teachers</a></li>
</ul>
</div>
<div>
<h4 className="text-surface-bright font-semibold mb-sm">Company</h4>
<ul className="space-y-sm">
<li className=""><a className="text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-surface-bright transition-opacity focus:outline-none  rounded" href="about.html">About Us</a></li>
<li className=""><a className="text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-surface-bright transition-opacity focus:outline-none  rounded" href="careers.html">Careers</a></li>
<li className=""><a className="text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-surface-bright transition-opacity focus:outline-none  rounded" href="contact.html">Contact</a></li>
</ul>
</div>
<div>
<h4 className="text-surface-bright font-semibold mb-sm">Legal & Support</h4>
<ul className="space-y-sm">
<li className=""><a className="text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-surface-bright transition-opacity focus:outline-none  rounded" href="privacy.html">Privacy Policy</a></li>
<li className=""><a className="text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-surface-bright transition-opacity focus:outline-none  rounded" href="terms.html">Terms of Service</a></li>
<li className=""><a className="text-surface-bright underline focus:outline-none  rounded" href="help.html">Help Center</a></li>
</ul>
</div>
</div>
</div>
<div className="border-t border-on-primary/10 px-margin-mobile md:px-margin-desktop py-md max-w-max-width mx-auto flex flex-col md:flex-row justify-between items-center gap-sm">
<p className="text-primary-fixed-dim opacity-80 text-sm">© 2026 A1 Academy. Scholarly excellence for the modern age.</p>
</div>
</footer>

{/*  Modals injected via JavaScript  */}


    </>
  );
}