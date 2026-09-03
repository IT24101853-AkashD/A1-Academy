import React, { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children }) {
  useEffect(() => {
    if (window.AOS) {
      window.AOS.init({
        once: false,
        offset: 50,
        duration: 1000,
        easing: 'ease-out-cubic'
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-amber-300 selection:text-slate-900">
      <Navbar />
      <main className="flex-grow flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
