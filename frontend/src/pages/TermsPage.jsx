import React from 'react';

export default function TermsPage() {
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

{/*  TERMS OF SERVICE MAIN CONTENT  */}
<main className="flex-grow bg-surface w-full">
<div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-xl grid grid-cols-1 md:grid-cols-4 gap-gutter">

{/*  Left Sidebar Navigation  */}
<aside className="col-span-1 md:block hidden">
<div className="sticky top-32 space-y-4">
<h3 className="font-headline-sm text-headline-sm text-primary mb-6">Legal & Support</h3>
<nav className="flex flex-col space-y-2">
<a className="text-on-surface-variant hover:bg-surface-container-low hover:text-primary px-4 py-3 border-l-4 border-transparent transition-colors rounded-r-md" href="privacy.html">Privacy Policy</a>
<a className="font-bold border-l-4 border-primary bg-surface-container-low text-primary px-4 py-3 rounded-r-md transition-colors" href="terms.html">Terms of Service</a>
<a className="text-on-surface-variant hover:bg-surface-container-low hover:text-primary px-4 py-3 border-l-4 border-transparent transition-colors rounded-r-md" href="help.html">Help Center</a>
</nav>
</div>
</aside>

{/*  Right Content Area  */}
<div className="col-span-1 md:col-span-3">
<div className="bg-surface-container-lowest rounded-[16px] p-6 md:p-12 shadow-level-1 border border-surface-variant">
<header className="mb-8 border-b border-surface-variant pb-8">
<h1 className="font-headline-md text-headline-md text-primary mb-2">Terms of Service for A1 Academy</h1>
<p className="text-on-surface-variant font-label-md">Last Updated: August 2026</p>
</header>

<div className="space-y-8 font-body-md text-body-md text-on-surface">
<p className="text-body-lg text-on-surface-variant leading-relaxed">
    Welcome to A1 Academy. By registering an account and accessing our digital tuition platform, you agree to abide by the following rules and regulations.
</p>

{/*  Section 1  */}
<section>
<h2 className="font-headline-sm text-headline-sm text-primary mb-4 flex items-center gap-2">
<span className="material-symbols-outlined text-primary" data-icon="gavel">gavel</span>
    Section 1: Account Roles & Responsibilities
</h2>
<p className="text-on-surface-variant leading-relaxed mb-4">
    A1 Academy operates on a strict Role-Based Access Control (RBAC) system. Your capabilities on the platform are determined by your assigned role:
</p>
<ul className="list-disc pl-6 space-y-2 text-on-surface-variant marker:text-primary">
    <li><strong>Accurate Information:</strong> All users (Students, Teachers, and Administrators) must provide accurate and verifiable information during registration.</li>
    <li><strong>Role Enforcement:</strong> Users must not attempt to bypass the frontend interface or backend API to access dashboards, endpoints, or tools assigned to a different role.</li>
</ul>
</section>

{/*  Section 2  */}
<section>
<h2 className="font-headline-sm text-headline-sm text-primary mb-4 flex items-center gap-2">
<span className="material-symbols-outlined text-primary" data-icon="verified_user">verified_user</span>
    Section 2: Teacher Application & Verification
</h2>
<p className="text-on-surface-variant leading-relaxed mb-4">
    To maintain the highest standard of scholarly excellence, all educator applications are subject to manual review.
</p>
<ul className="list-disc pl-6 space-y-2 text-on-surface-variant marker:text-primary">
    <li><strong>Pending Status:</strong> Upon initial registration, all Teacher accounts are placed in a "Pending" status.</li>
    <li><strong>Restricted Access:</strong> Pending Teachers cannot schedule classes, upload study materials, or interact with students until an Administrator manually verifies their credentials and upgrades their account to "Active".</li>
</ul>
</section>

{/*  Section 3  */}
<section>
<h2 className="font-headline-sm text-headline-sm text-primary mb-4 flex items-center gap-2">
<span className="material-symbols-outlined text-primary" data-icon="school">school</span>
    Section 3: Academic Access & Integrity
</h2>
<p className="text-on-surface-variant leading-relaxed mb-4">
    A1 Academy provides premium digital study materials and assignment workflows.
</p>
<ul className="list-disc pl-6 space-y-2 text-on-surface-variant marker:text-primary">
    <li><strong>Exclusive Access:</strong> Course materials, PDF notes, and assignment submission portals are strictly reserved for students who are officially enrolled in that specific class. Attempting to download materials without an active enrollment is a violation of these terms.</li>
</ul>
</section>

{/*  Section 4  */}
<section>
<h2 className="font-headline-sm text-headline-sm text-primary mb-4 flex items-center gap-2">
<span className="material-symbols-outlined text-primary" data-icon="block">block</span>
    Section 4: Account Deactivation & Enforcement
</h2>
<p className="text-on-surface-variant leading-relaxed mb-4">
    Administrators are responsible for maintaining a safe and productive learning environment.
</p>
<ul className="list-disc pl-6 space-y-2 text-on-surface-variant marker:text-primary">
    <li><strong>Right to Revoke Access:</strong> A1 Academy Administrators reserve the right to change any user's status to "Deactivated" for violating these terms or engaging in disruptive behavior.</li>
    <li><strong>Immediate Termination:</strong> If an account is deactivated, any active platform sessions for that user will be instantly terminated, and all future login attempts will be blocked in real-time.</li>
</ul>
</section>

{/*  Section 5  */}
<section className="bg-surface-container-low p-6 rounded-lg mt-12">
<h2 className="font-headline-sm text-headline-sm text-primary mb-2 flex items-center gap-2">
<span className="material-symbols-outlined text-primary" data-icon="mail">mail</span>
    Section 5: Contact Us
</h2>
<p className="text-on-surface-variant">
    If you have any questions regarding these terms, please reach out to our administration at: <a className="text-secondary font-bold hover:underline" href="mailto:support@a1academy.lk">support@a1academy.lk</a>
</p>
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
<li className=""><a className="text-surface-bright underline focus:outline-none  rounded" href="terms.html">Terms of Service</a></li>
<li className=""><a className="text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-surface-bright transition-opacity focus:outline-none  rounded" href="help.html">Help Center</a></li>
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