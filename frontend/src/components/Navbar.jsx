import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.dispatchEvent(new Event('auth-change'));
    window.location.href = '/';
  };

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 font-jakarta ${scrolled ? 'shadow-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 py-2' : 'bg-transparent py-4'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <Link to={isAdmin ? "/admin" : "/"} className="text-4xl font-extrabold tracking-tighter text-slate-900 dark:text-white cursor-pointer">
          A1<span className="text-amber-500">Academy</span>
        </Link>

        <div className="flex gap-4 items-center">
          {isAdmin && (
            <Link
              to="/admin/users"
              className="text-slate-600 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white transition-colors px-4">
              User Directory
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin/categories"
              className="text-slate-600 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white transition-colors px-4">
              Categories
            </Link>
          )}
          {isStudent && (
            <Link
              to="/student/categories"
              className="text-slate-600 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white transition-colors px-4">
              Categories
            </Link>
          )}
          {isStudent && (
            <Link
              to="/student/my-classes"
              className="text-slate-600 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white transition-colors px-4">
              My Classes
            </Link>
          )}
          {isTeacher && (
            <Link
              to="/teacher/classes"
              className="text-slate-600 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white transition-colors px-4">
              My Classes
            </Link>
          )}
          {isLoggedIn && (
            <Link
              to="/profile"
              className="text-slate-600 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white transition-colors px-4">
              My Profile
            </Link>
          )}

          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="bg-slate-900 dark:bg-amber-400 hover:bg-slate-800 dark:hover:bg-amber-300 text-white dark:text-slate-900 px-6 py-2.5 rounded-full font-semibold transition-all shadow-md cursor-pointer">
              Logout
            </button>
          ) : (
            <>
              <button
                onClick={() => window.openReactModal && window.openReactModal('login-modal')}
                className="text-slate-600 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white transition-colors px-4">
                Login
              </button>
              <button
                onClick={() => window.openReactModal && window.openReactModal('register-modal')}
                className="bg-slate-900 dark:bg-amber-400 hover:bg-slate-800 dark:hover:bg-amber-300 text-white dark:text-slate-900 px-6 py-2.5 rounded-full font-semibold transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5">
                Register
              </button>
            </>
          )}
          <ThemeToggle className="w-10 h-10" />
        </div>
      </div>
    </nav>
  );
}
