import React from 'react';

export default function IndexPage() {
  return (
    <>
      
{/*  TopNavBar  */}
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
{/*  Trigger for the Modal  */}
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
<main className="flex-grow">
{/*  Hero Section  */}
<section className="relative pt-xl pb-lg px-margin-mobile md:px-margin-desktop max-w-max-width mx-auto overflow-hidden">
<div className="grid grid-cols-1 lg:grid-cols-2 gap-lg items-center">
<div className="z-10">
<h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-md">Empowering Excellence Through Expert Tutoring</h1>
<p className="font-body-lg text-body-lg text-on-surface-variant mb-lg max-w-xl">A1 Academy connects ambitious students with top-tier educators. Experience personalized learning paths, digital badges, and gamified progress tracking designed to elevate your educational journey.</p>
<div className="flex flex-col sm:flex-row gap-md">
<a className="inline-flex items-center justify-center bg-secondary-container text-on-secondary-container font-label-md text-label-md px-8 py-3 rounded-full hover:bg-secondary-fixed active:scale-95 transition-all shadow-level-1 hover:shadow-level-2 cursor-pointer" onClick={() => { window.openReactModal('register-student-modal') }}>
                            Join as a Student
                            <span className="material-symbols-outlined ml-2 text-[18px]">school</span>
</a>
<a className="inline-flex items-center justify-center border-2 border-primary text-primary font-label-md text-label-md px-8 py-3 rounded-full hover:bg-surface-container-low active:scale-95 transition-all cursor-pointer" onClick={() => { window.openReactModal('register-teacher-modal') }}>
                            Teach with Us
                            <span className="material-symbols-outlined ml-2 text-[18px]">co_present</span>
</a>
</div>
</div>
<div className="relative z-10 hidden lg:block h-[500px] rounded-xl overflow-hidden shadow-level-2">
{/*  Changed to a high-res Unsplash image to prevent pixelation on large screens  */}
<img className="w-full h-full object-cover" data-alt="A brightly lit, modern classroom setting where a professional tutor in smart casual attire is engaging with a focused student over a digital tablet. The scene is academic and trustworthy, utilizing a light-mode aesthetic with soft blues and crisp whites. High-quality, cinematic depth of field." src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2000&auto=format&fit=crop"/>
<div className="absolute bottom-6 left-6 right-6 bg-surface-container-lowest/90 backdrop-blur-md p-4 rounded-lg shadow-level-1 flex items-center justify-between border border-surface-dim">
<div className="flex items-center gap-3">
<div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
<span className="material-symbols-outlined">trending_up</span>
</div>
<div>
<p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Average Improvement</p>
<p className="font-headline-sm text-headline-sm text-primary">2.4 Grades</p>
</div>
</div>
</div>
</div>
</div>
{/*  Decorative background elements  */}
<div className="absolute top-0 right-0 -mr-[20%] -mt-[10%] w-[60%] h-[80%] bg-primary-fixed/30 rounded-full blur-3xl -z-10 pointer-events-none"></div>
<div className="absolute bottom-0 left-0 -ml-[10%] w-[40%] h-[60%] bg-secondary-fixed/20 rounded-full blur-3xl -z-10 pointer-events-none"></div>
</section>
{/*  Categories Section  */}
<section className="bg-surface-container-low py-xl px-margin-mobile md:px-margin-desktop">
<div className="max-w-max-width mx-auto">
<h2 className="font-headline-md text-headline-md text-primary mb-lg text-center">Explore Course Categories</h2>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
{/*  Category Card 1  */}
<div className="bg-white rounded-[16px] p-6 shadow-level-1 hover:shadow-level-2 transition-all duration-300 border border-transparent hover:border-primary-fixed group flex flex-col h-full cursor-pointer">
    <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-primary-container transition-colors">
        <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container transition-colors" style={{ fontVariationSettings: "'FILL' 1", fontWeight: 200 }}>calculate</span>
    </div>
    <h3 className="font-headline-sm text-[20px] text-primary mb-3">Mathematics</h3>
    <p className="font-body-md text-body-md text-on-surface-variant flex-grow">Master algebra, calculus, geometry and statistics with expert guidance.</p>
</div>
{/*  Category Card 2  */}
<div className="bg-white rounded-[16px] p-6 shadow-level-1 hover:shadow-level-2 transition-all duration-300 border border-transparent hover:border-primary-fixed group flex flex-col h-full cursor-pointer">
    <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-primary-container transition-colors">
        <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container transition-colors" style={{ fontVariationSettings: "'FILL' 1", fontWeight: 200 }}>science</span>
    </div>
    <h3 className="font-headline-sm text-[20px] text-primary mb-3">Science</h3>
    <p className="font-body-md text-body-md text-on-surface-variant flex-grow">Discover the wonders of physics, chemistry, and biology subjects.</p>
</div>
{/*  Category Card 3  */}
<div className="bg-white rounded-[16px] p-6 shadow-level-1 hover:shadow-level-2 transition-all duration-300 border border-transparent hover:border-primary-fixed group flex flex-col h-full cursor-pointer">
    <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-primary-container transition-colors">
        <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container transition-colors" style={{ fontVariationSettings: "'FILL' 1", fontWeight: 200 }}>computer</span>
    </div>
    <h3 className="font-headline-sm text-[20px] text-primary mb-3">Computing</h3>
    <p className="font-body-md text-body-md text-on-surface-variant flex-grow">Learn coding, data structures, algorithms, and artificial intelligence.</p>
</div>
{/*  Category Card 4  */}
<div className="bg-white rounded-[16px] p-6 shadow-level-1 hover:shadow-level-2 transition-all duration-300 border border-transparent hover:border-primary-fixed group flex flex-col h-full cursor-pointer">
    <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-primary-container transition-colors">
        <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container transition-colors" style={{ fontVariationSettings: "'FILL' 1", fontWeight: 200 }}>language</span>
    </div>
    <h3 className="font-headline-sm text-[20px] text-primary mb-3">Languages</h3>
    <p className="font-body-md text-body-md text-on-surface-variant flex-grow">Achieve fluency in new languages through immersive learning.</p>
</div>
</div>
</div>
</section>
</main>
{/*  Footer  */}
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