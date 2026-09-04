import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  // UX nicety only - hiding this link from non-Admins is not the access control. The real
  // restriction is server-side, on GET /api/users (see UsersController).
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsAdmin(localStorage.getItem('role') === 'Admin');
  }, []);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'shadow-sm bg-white/90 backdrop-blur-md border-b border-slate-200 py-2' : 'bg-transparent py-4'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <Link to="/" className="text-4xl font-extrabold tracking-tighter text-slate-900 cursor-pointer">
          A1<span className="text-amber-500">Academy</span>
        </Link>
        
        <div className="flex gap-4 items-center">
          {isAdmin && (
            <Link
              to="/admin/users"
              className="text-slate-600 font-semibold hover:text-slate-900 transition-colors px-4">
              User Directory
            </Link>
          )}
          <button
            onClick={() => window.openReactModal && window.openReactModal('login-modal')}
            className="text-slate-600 font-semibold hover:text-slate-900 transition-colors px-4">
            Login
          </button>
          <button 
            onClick={() => window.openReactModal && window.openReactModal('register-modal')}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5">
            Register
          </button>
        </div>
      </div>
    </nav>
  );
}
