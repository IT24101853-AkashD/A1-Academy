const STORAGE_KEY = 'theme';

export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable (private browsing etc.) - theme just won't persist across reloads.
  }
}

// Called once at startup so the previously chosen theme (or the OS preference, on a first visit)
// is applied before the app renders, avoiding a light-mode flash for dark-mode users.
export function initTheme() {
  const stored = getStoredTheme();
  const theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(theme);
  return theme;
}
