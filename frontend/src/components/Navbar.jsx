import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clearSession } from '../utils/session';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  // UX nicety only - hiding this link from non-Admins is not the access control. The real
  // restriction is server-side, on GET /api/users (see UsersController).
  const [isAdmin, setIsAdmin] = useState(false);
  // Same UX-nicety-only story as isAdmin, for StudentCategoriesPage's own client-side gate.
  const [isStudent, setIsStudent] = useState(false);
  // Any logged-in role can view their own profile (GET /api/auth/me) - a stored token is a good
  // enough signal to show the link; the page itself re-checks against the live token on load.
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsAdmin(localStorage.getItem('role') === 'Admin');
    setIsStudent(localStorage.getItem('role') === 'Student');
    setIsLoggedIn(Boolean(localStorage.getItem('token')));
  }, []);

  // A full navigation (not client-side routing) rather than just updating this component's own
  // state - every page that reads localStorage.role/token directly (AdminUsersPage, ProfilePage,
  // CategoryManagementPage) does so once on mount, so a hard reload is what actually gets all of
  // them - and this Navbar - back in sync with the now-cleared session in one move.
  const handleLogout = () => {
    clearSession();
    window.location.href = '/';
  };

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
          {isAdmin && (
            <Link
              to="/admin/categories"
              className="text-slate-600 font-semibold hover:text-slate-900 transition-colors px-4">
              Categories
            </Link>
          )}
          {isStudent && (
            <Link
              to="/student/categories"
              className="text-slate-600 font-semibold hover:text-slate-900 transition-colors px-4">
              Categories
            </Link>
          )}
          {isLoggedIn && (
            <Link
              to="/profile"
              className="text-slate-600 font-semibold hover:text-slate-900 transition-colors px-4">
              My Profile
            </Link>
          )}
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="text-slate-600 font-semibold hover:text-slate-900 transition-colors px-4 cursor-pointer">
              Log Out
            </button>
          ) : (
            // Single entry point into the book - it already has "Create an Account" / "Sign In"
            // links on its own pages to move between login and registration, so a separate
            // Register button here would just be a second door into the same room.
            <button
              onClick={() => window.openReactModal && window.openReactModal('login-modal')}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5">
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
