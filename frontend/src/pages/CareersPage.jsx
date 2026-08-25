import React from 'react';

export default function CareersPage() {
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

{/*  NEW CAREERS MAIN CONTENT  */}
<main className="flex-grow flex flex-col items-center justify-center min-h-[60vh] bg-surface px-margin-mobile md:px-margin-desktop py-xl">
    <div className="max-w-3xl w-full text-center flex flex-col items-center gap-8">
        <span className="material-symbols-outlined text-[120px] text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>
            sentiment_dissatisfied
        </span>
        <h1 className="text-primary font-headline-md text-headline-md">
            We're growing, but our team is currently full!
        </h1>
        <p className="text-body-lg font-body-lg text-on-surface-variant max-w-2xl">
            While we do not have any open positions right now, A1 Academy is constantly expanding. We are always looking for passionate educators and technical innovators. Please check back soon—your next big opportunity might be just around the corner.
        </p>
        <a className="inline-flex justify-center items-center px-8 py-3 bg-primary text-on-primary font-label-md text-label-md rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm" href="index.html">
            Return to Homepage
        </a>
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
<li className=""><a className="text-surface-bright underline focus:outline-none  rounded" href="careers.html">Careers</a></li>
<li className=""><a className="text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-surface-bright transition-opacity focus:outline-none  rounded" href="contact.html">Contact</a></li>
</ul>
</div>
<div>
<h4 className="text-surface-bright font-semibold mb-sm">Legal & Support</h4>
<ul className="space-y-sm">
<li className=""><a className="text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-surface-bright transition-opacity focus:outline-none  rounded" href="privacy.html">Privacy Policy</a></li>
<li className=""><a className="text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-surface-bright transition-opacity focus:outline-none  rounded" href="terms.html">Terms of Service</a></li>
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