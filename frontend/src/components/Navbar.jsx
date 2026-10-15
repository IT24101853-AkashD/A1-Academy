import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const linkClass = 'text-slate-600 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap';
const mobileLinkClass = 'block px-4 py-3 rounded-xl text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // UX nicety only - hiding this link from non-Admins is not the access control. The real
  // restriction is server-side, on GET /api/users (see UsersController).
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('role') === 'Admin');
  const [isStudent, setIsStudent] = useState(localStorage.getItem('role') === 'Student');
  const [isTeacher, setIsTeacher] = useState(localStorage.getItem('role') === 'Teacher');
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      setIsAdmin(localStorage.getItem('role') === 'Admin');
      setIsStudent(localStorage.getItem('role') === 'Student');
      setIsTeacher(localStorage.getItem('role') === 'Teacher');
      setIsLoggedIn(!!localStorage.getItem('token'));
    };

    window.addEventListener('auth-change', checkAuth);
    return () => window.removeEventListener('auth-change', checkAuth);
  }, []);

  // Close the mobile menu on Escape and when the screen grows to desktop width (links close it on click).
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onResize = () => { if (desktop.matches) setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onResize);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.dispatchEvent(new Event('auth-change'));
    window.location.href = '/';
  };

  const openModal = (id) => {
    setMenuOpen(false);
    if (window.openReactModal) window.openReactModal(id);
  };

  const links = [
    isAdmin && { to: '/admin/users', label: 'User Directory' },
    isAdmin && { to: '/admin/categories', label: 'Categories' },
    isStudent && { to: '/student/categories', label: 'Categories' },
    isStudent && { to: '/classes', label: 'Browse Classes' },
    isStudent && { to: '/student/my-classes', label: 'My Classes' },
    isTeacher && { to: '/teacher/classes', label: 'My Classes' },
    isTeacher && { to: '/teacher/reports', label: 'Class Reports' },
    { to: '/recognition', label: 'Recognition Board' },
    isLoggedIn && { to: '/profile', label: 'My Profile' },
  ].filter(Boolean);

  const solid = scrolled || menuOpen;

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 font-jakarta ${solid ? 'shadow-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 py-2' : 'bg-transparent py-3 lg:py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center gap-4">
        <Link to={isAdmin ? "/admin" : "/"} onClick={() => setMenuOpen(false)} className="shrink-0 text-2xl sm:text-3xl xl:text-4xl font-extrabold tracking-tighter text-slate-900 dark:text-white cursor-pointer">
          A1<span className="text-amber-500">Academy</span>
        </Link>

        <div className="hidden lg:flex gap-x-5 xl:gap-x-7 items-center text-[15px] xl:text-base">
          {links.map(l => (
            <Link key={l.to} to={l.to} className={linkClass}>{l.label}</Link>
          ))}

          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="bg-slate-900 dark:bg-amber-400 hover:bg-slate-800 dark:hover:bg-amber-300 text-white dark:text-slate-900 px-6 py-2.5 rounded-full font-semibold transition-all shadow-md cursor-pointer whitespace-nowrap">
              Logout
            </button>
          ) : (
            <>
              <button
                onClick={() => openModal('login-modal')}
                className={linkClass}>
                Login
              </button>
              <button
                onClick={() => openModal('register-modal')}
                className="bg-slate-900 dark:bg-amber-400 hover:bg-slate-800 dark:hover:bg-amber-300 text-white dark:text-slate-900 px-6 py-2.5 rounded-full font-semibold transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 whitespace-nowrap">
                Register
              </button>
            </>
          )}
          <ThemeToggle className="w-10 h-10" />
        </div>

        <div className="flex lg:hidden items-center gap-2">
          <ThemeToggle className="w-10 h-10" />
          <button
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-md cursor-pointer">
            <span className="material-symbols-outlined text-2xl">{menuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="lg:hidden max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-200 dark:border-slate-700 mt-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-1">
            {links.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} className={mobileLinkClass}>{l.label}</Link>
            ))}
            <div className="pt-2 mt-1 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-2">
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="w-full sm:w-auto bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 px-6 py-3 rounded-full font-semibold shadow-md cursor-pointer">
                  Logout
                </button>
              ) : (
                <>
                  <button
                    onClick={() => openModal('login-modal')}
                    className="w-full sm:w-auto px-6 py-3 rounded-full font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 cursor-pointer">
                    Login
                  </button>
                  <button
                    onClick={() => openModal('register-modal')}
                    className="w-full sm:w-auto bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 px-6 py-3 rounded-full font-semibold shadow-md cursor-pointer">
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
