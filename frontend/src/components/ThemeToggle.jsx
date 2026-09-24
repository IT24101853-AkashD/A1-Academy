import React, { useState } from 'react';
import { getStoredTheme, applyTheme } from '../utils/theme';

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(
    () => getStoredTheme() || (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  );

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
      title={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
      className={`w-12 h-12 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-amber-300 shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer ${className}`}
    >
      <span className="material-symbols-outlined text-2xl">
        {theme === 'dark' ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
}
