import React from 'react';

export default function AboutPage() {
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

{/*  NEW ABOUT US MAIN CONTENT  */}
<main className="flex-grow">
    {/*  Hero Section  */}
    <section className="py-xl px-margin-mobile md:px-margin-desktop text-center max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[512px]">
    <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-6">Empowering the Next Generation of Scholars</h1>
    <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl leading-relaxed">
                    At A1 Academy, we believe that quality education should be accessible, engaging, and measurable. Founded on the principle of scholarly excellence, our platform bridges the gap between ambitious students and verified, top-tier educators. We do not just facilitate classes; we build personalized learning pathways designed to elevate every student's academic journey.
                </p>
    </section>
    {/*  What Sets Us Apart Section  */}
    <section className="py-xl px-margin-mobile md:px-margin-desktop max-w-max-width mx-auto bg-surface">
    <h2 className="font-headline-md text-headline-md text-primary text-center mb-12">What Sets Us Apart</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
    {/*  Card 1  */}
    <div className="bg-white rounded-[16px] p-6 shadow-level-1 hover:shadow-level-2 transition-all duration-300 border border-transparent hover:border-primary-fixed group flex flex-col h-full">
    <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-primary-container transition-colors">
    <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container transition-colors" data-icon="school" style={{ fontVariationSettings: "'FILL' 1", fontWeight: 200 }}>school</span>
    </div>
    <h3 className="font-headline-sm text-headline-sm text-primary mb-3">Expert Educators</h3>
    <p className="font-body-md text-body-md text-on-surface-variant flex-grow">
                            A rigorously vetted community of teachers, providing expert guidance across Mathematics, Science, Computing, and Languages.
                        </p>
    </div>
    {/*  Card 2  */}
    <div className="bg-white rounded-[16px] p-6 shadow-level-1 hover:shadow-level-2 transition-all duration-300 border border-transparent hover:border-primary-fixed group flex flex-col h-full">
    <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-primary-container transition-colors">
    <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container transition-colors" data-icon="touch_app" style={{ fontVariationSettings: "'FILL' 1", fontWeight: 200 }}>touch_app</span>
    </div>
    <h3 className="font-headline-sm text-headline-sm text-primary mb-3">Frictionless Learning</h3>
    <p className="font-body-md text-body-md text-on-surface-variant flex-grow">
                            An intuitive, unified dashboard where students can seamlessly browse course catalogs, enroll in classes, and access premium digital study materials.
                        </p>
    </div>
    {/*  Card 3  */}
    <div className="bg-white rounded-[16px] p-6 shadow-level-1 hover:shadow-level-2 transition-all duration-300 border border-transparent hover:border-primary-fixed group flex flex-col h-full">
    <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-primary-container transition-colors">
    <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container transition-colors" data-icon="military_tech" style={{ fontVariationSettings: "'FILL' 1", fontWeight: 200 }}>military_tech</span>
    </div>
    <h3 className="font-headline-sm text-headline-sm text-primary mb-3">Gamified Progress</h3>
    <p className="font-body-md text-body-md text-on-surface-variant flex-grow">
                            We believe in rewarding hard work. Our integrated digital badge system and public recognition boards keep students motivated and engaged.
                        </p>
    </div>
    {/*  Card 4  */}
    <div className="bg-white rounded-[16px] p-6 shadow-level-1 hover:shadow-level-2 transition-all duration-300 border border-transparent hover:border-primary-fixed group flex flex-col h-full">
    <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-primary-container transition-colors">
    <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container transition-colors" data-icon="bar_chart" style={{ fontVariationSettings: "'FILL' 1", fontWeight: 200 }}>bar_chart</span>
    </div>
    <h3 className="font-headline-sm text-headline-sm text-primary mb-3">Data-Driven Success</h3>
    <p className="font-body-md text-body-md text-on-surface-variant flex-grow">
                            With dynamic progress cards and detailed grading analytics, students and teachers can visualize academic growth in real-time.
                        </p>
    </div>
    </div>
    </section>
    {/*  The Vision Section  */}
    <section className="w-full bg-surface-container-low py-xl px-margin-mobile md:px-margin-desktop mt-12">
    <div className="max-w-4xl mx-auto text-center">
    <h2 className="font-headline-sm text-headline-sm text-outline mb-8 uppercase tracking-widest text-sm font-semibold">The Vision</h2>
    <blockquote className="font-headline-md text-headline-md text-primary italic leading-relaxed relative">
    <span className="material-symbols-outlined absolute -top-8 -left-8 text-surface-container-highest text-6xl opacity-50" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</span>
                        "To be the premier digital tuition hub where administrative friction is eliminated, allowing teachers to focus purely on teaching and students to focus purely on learning."
                    </blockquote>
    </div>
    </section>
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
<li className=""><a className="text-surface-bright underline focus:outline-none  rounded" href="about.html">About Us</a></li>
<li className=""><a className="text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-surface-bright transition-opacity focus:outline-none  rounded" href="careers.html">Careers</a></li>
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