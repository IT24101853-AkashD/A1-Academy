import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from '../ProfilePage';

const renderPage = () => render(
  <MemoryRouter>
    <ProfilePage />
  </MemoryRouter>
);

describe('ProfilePage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('shows Sign In Required and never calls the API with no token stored', async () => {
    global.fetch = vi.fn();

    renderPage();

    expect(await screen.findByText(/sign in required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches and renders Name, Email, and Role for a logged-in user', async () => {
    localStorage.setItem('token', 'student-token');
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ name: 'Jamie Rivera', email: 'jamie@example.com', role: 'Student' }),
      })
    );

    renderPage();

    expect(await screen.findByText('jamie@example.com')).toBeInTheDocument();
    // "Jamie Rivera" appears twice (header + details list) - just confirm it rendered at all.
    expect(screen.getAllByText('Jamie Rivera').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Student').length).toBeGreaterThan(0);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/auth/me');
    expect(options.headers.Authorization).toBe('Bearer student-token');
  });

  it('shows Session Ended and clears localStorage when the backend returns 401', async () => {
    localStorage.setItem('token', 'now-dead-token');
    localStorage.setItem('role', 'Student');
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 401 }));

    renderPage();

    expect(await screen.findByText(/session ended/i)).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('role')).toBeNull();
  });

  it('shows a plain error message on an unexpected server error', async () => {
    localStorage.setItem('token', 'student-token');
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500 }));

    renderPage();

    expect(await screen.findByText(/request failed with status 500/i)).toBeInTheDocument();
  });
});
