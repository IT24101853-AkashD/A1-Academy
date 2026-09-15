import React, { useEffect } from 'react';

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
    <div className="flex flex-col w-full text-slate-900 font-sans selection:bg-amber-300 selection:text-slate-900">
      <main className="flex-grow flex flex-col">
        {children}
      </main>
    </div>
  );
}
