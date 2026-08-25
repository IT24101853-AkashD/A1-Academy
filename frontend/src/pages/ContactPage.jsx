import React from 'react';

export default function ContactPage() {
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

{/*  NEW CONTACT US MAIN CONTENT  */}
<main className="flex-grow bg-surface">
  {/*  Image Hero Header  */}
  <section className="relative w-full h-[350px] flex flex-col items-center justify-center px-margin-mobile md:px-margin-desktop text-center overflow-hidden">
    {/*  Background Image  */}
    <img className="absolute inset-0 w-full h-full object-cover" src="https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=2000&auto=format&fit=crop" alt="Modern educational building exterior" />
    {/*  Dark Overlay  */}
    <div className="absolute inset-0 bg-primary/70"></div>
    
    {/*  Content  */}
    <div className="relative z-10 flex flex-col items-center">
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-white mb-4">Get in Touch with A1 Academy</h1>
        <p className="font-body-lg text-body-lg text-surface-bright max-w-2xl">
            Whether you are a student, a teacher, or an administrator, our team is here to help.
        </p>
    </div>
  </section>

  {/*  Contact Information Cards  */}
  <section className="relative z-20 max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop -mt-16 pb-xl">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
      
      {/*  Card 1: Headquarters  */}
      <div className="bg-white rounded-[16px] p-6 shadow-level-2 hover:shadow-level-3 transition-all duration-300 border border-transparent hover:border-primary-fixed group flex flex-col items-center justify-center text-center cursor-pointer">
        <div className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center mb-4 group-hover:bg-primary-container transition-colors">
          <span className="material-symbols-outlined text-primary text-[28px] group-hover:text-on-primary-container transition-colors" style={{ fontVariationSettings: "'FILL' 1", fontWeight: 200 }}>location_on</span>
        </div>
        <h3 className="font-headline-sm text-[20px] text-primary mb-2">Headquarters</h3>
        <p className="text-body-md font-body-md text-on-surface-variant">15 Education Mawatha,<br />Nuwara Eliya, Sri Lanka</p>
      </div>

      {/*  Card 2: Email  */}
      <div className="bg-white rounded-[16px] p-6 shadow-level-2 hover:shadow-level-3 transition-all duration-300 border border-transparent hover:border-primary-fixed group flex flex-col items-center justify-center text-center cursor-pointer">
        <div className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center mb-4 group-hover:bg-primary-container transition-colors">
          <span className="material-symbols-outlined text-primary text-[28px] group-hover:text-on-primary-container transition-colors" style={{ fontVariationSettings: "'FILL' 1", fontWeight: 200 }}>mail</span>
        </div>
        <h3 className="font-headline-sm text-[20px] text-primary mb-2">Email Support</h3>
        <p className="text-body-md font-body-md text-on-surface-variant">support@a1academy.lk</p>
      </div>

      {/*  Card 3: Phone  */}
      <div className="bg-white rounded-[16px] p-6 shadow-level-2 hover:shadow-level-3 transition-all duration-300 border border-transparent hover:border-primary-fixed group flex flex-col items-center justify-center text-center cursor-pointer">
        <div className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center mb-4 group-hover:bg-primary-container transition-colors">
          <span className="material-symbols-outlined text-primary text-[28px] group-hover:text-on-primary-container transition-colors" style={{ fontVariationSettings: "'FILL' 1", fontWeight: 200 }}>call</span>
        </div>
        <h3 className="font-headline-sm text-[20px] text-primary mb-2">Phone</h3>
        <p className="text-body-md font-body-md text-on-surface-variant">+94 77 123 4567</p>
      </div>

      {/*  Card 4: Working Hours  */}
      <div className="bg-white rounded-[16px] p-6 shadow-level-2 hover:shadow-level-3 transition-all duration-300 border border-transparent hover:border-primary-fixed group flex flex-col items-center justify-center text-center cursor-pointer">
        <div className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center mb-4 group-hover:bg-primary-container transition-colors">
          <span className="material-symbols-outlined text-primary text-[28px] group-hover:text-on-primary-container transition-colors" style={{ fontVariationSettings: "'FILL' 1", fontWeight: 200 }}>schedule</span>
        </div>
        <h3 className="font-headline-sm text-[20px] text-primary mb-2">Working Hours</h3>
        <p className="text-body-md font-body-md text-on-surface-variant">Monday – Saturday, 8:00 AM<br />to 6:00 PM (LKT)</p>
      </div>

    </div>
  </section>

  {/*  FAQ Section  */}
  <section className="max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop py-xl">
    <div className="text-center mb-12">
      <h2 className="font-headline-md text-headline-md text-primary mb-4">Frequently Asked Questions</h2>
      <p className="font-body-md text-body-md text-on-surface-variant">Find quick answers to common questions about A1 Academy.</p>
    </div>
    
    <div className="space-y-4">
      {/*  FAQ 1  */}
      <div className="bg-white border border-surface-variant rounded-lg p-6 shadow-sm hover:shadow-level-1 transition-shadow">
        <h3 className="font-headline-sm text-[18px] text-primary mb-2">How do I enroll in a class?</h3>
        <p className="text-body-md font-body-md text-on-surface-variant">Simply register for a free Student account. Once logged in, you can browse our Course Catalog by subject, view available seats, and instantly enroll in any active class.</p>
      </div>
      
      {/*  FAQ 2  */}
      <div className="bg-white border border-surface-variant rounded-lg p-6 shadow-sm hover:shadow-level-1 transition-shadow">
        <h3 className="font-headline-sm text-[18px] text-primary mb-2">How do I apply to become a teacher?</h3>
        <p className="text-body-md font-body-md text-on-surface-variant">Click the "Register" button and select the Teacher role. Your account will be placed in a "Pending" status while our Administrators review your professional qualifications. Once approved, you can begin scheduling classes.</p>
      </div>

      {/*  FAQ 3  */}
      <div className="bg-white border border-surface-variant rounded-lg p-6 shadow-sm hover:shadow-level-1 transition-shadow">
        <h3 className="font-headline-sm text-[18px] text-primary mb-2">How does the digital badge system work?</h3>
        <p className="text-body-md font-body-md text-on-surface-variant">Our gamified learning system allows teachers to award digital badges for excellent academic performance, perfect attendance, and class participation. These badges are permanently displayed on your student progress card.</p>
      </div>
    </div>
  </section>

  {/*  Location Map Section  */}
  <section className="w-full bg-surface-container-low py-xl px-margin-mobile md:px-margin-desktop">
    <div className="max-w-max-width mx-auto grid grid-cols-1 md:grid-cols-2 gap-lg items-center">
      <div>
        <h2 className="font-headline-md text-headline-md text-primary mb-4">Visit Our Campus</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-6">
          A1 Academy is proudly headquartered in the serene, focused environment of Nuwara Eliya. While our digital platform connects students globally, our administrative and support teams operate from our central campus.
        </p>
        <div className="flex items-center gap-3 text-primary font-label-md">
          <span className="material-symbols-outlined">directions_car</span>
          <span>Free parking available for all registered students and faculty.</span>
        </div>
      </div>
      {/*  Map Image Placeholder  */}
      <div className="w-full h-[300px] bg-surface-variant rounded-xl overflow-hidden shadow-level-2 border-4 border-white relative">
        <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1000&auto=format&fit=crop" alt="Map of Nuwara Eliya Headquarters" className="w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-primary text-white p-3 rounded-full shadow-lg flex items-center justify-center animate-bounce">
                <span className="material-symbols-outlined text-[32px]">pin_drop</span>
            </div>
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
<li className=""><a className="text-surface-bright underline focus:outline-none  rounded" href="contact.html">Contact</a></li>
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