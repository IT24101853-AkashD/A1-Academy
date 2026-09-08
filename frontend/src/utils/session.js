// Shared helper around the browser-stored session (the token + role saved by AuthModals at
// login). The app has no dedicated logout flow yet - this is the one place that clears that
// state, so anywhere that detects a dead session (a 401 from an authenticated endpoint) clears it
// the same way instead of leaving a stale token/role sitting in localStorage claiming the browser
// is still signed in.
export function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
}
