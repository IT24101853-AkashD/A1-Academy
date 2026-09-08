import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  const initialProfile = {
    name: 'Jamie Rivera',
    firstName: 'Jamie',
    lastName: 'Rivera',
    email: 'jamie@example.com',
    role: 'Student',
    phoneNumber: '555-0100',
  };

  it('clicking Edit Profile shows a form pre-filled with the current details', async () => {
    localStorage.setItem('token', 'student-token');
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(initialProfile) })
    );

    renderPage();
    await screen.findByText('jamie@example.com');

    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

    expect(screen.getByLabelText(/first name/i)).toHaveValue('Jamie');
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Rivera');
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('555-0100');
  });

  it('saving the form calls PUT /api/auth/me and shows the updated details', async () => {
    localStorage.setItem('token', 'student-token');
    const updatedProfile = { ...initialProfile, name: 'Jamie Smith', lastName: 'Smith', phoneNumber: '555-9999' };

    global.fetch = vi.fn((url, options) => {
      if (options?.method === 'PUT') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(updatedProfile) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(initialProfile) });
    });

    renderPage();
    await screen.findByText('jamie@example.com');

    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '555-9999' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(screen.getByText(/profile has been updated/i)).toBeInTheDocument());
    expect(screen.getByText('555-9999')).toBeInTheDocument();
    expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();

    const putCall = global.fetch.mock.calls.find(([, options]) => options?.method === 'PUT');
    expect(putCall[0]).toContain('/api/auth/me');
    expect(putCall[1].headers.Authorization).toBe('Bearer student-token');
    const body = JSON.parse(putCall[1].body);
    expect(body).toEqual({ firstName: 'Jamie', lastName: 'Smith', phoneNumber: '555-9999' });
  });

  it('Cancel discards changes without calling PUT', async () => {
    localStorage.setItem('token', 'student-token');
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(initialProfile) })
    );

    renderPage();
    await screen.findByText('jamie@example.com');

    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Somebody Else' } });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // "Jamie Rivera" appears twice (header + details list) once back in view mode.
    expect(screen.getAllByText('Jamie Rivera').length).toBeGreaterThan(0);
    expect(global.fetch).toHaveBeenCalledTimes(1); // only the initial GET, no PUT
  });

  it('shows a validation error from the backend and stays in edit mode', async () => {
    localStorage.setItem('token', 'student-token');
    global.fetch = vi.fn((url, options) => {
      if (options?.method === 'PUT') {
        return Promise.resolve({ ok: false, status: 400, text: () => Promise.resolve('First name is required.') });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(initialProfile) });
    });

    renderPage();
    await screen.findByText('jamie@example.com');

    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    // Whitespace rather than an empty string - the input's HTML `required` attribute is a UX
    // nicety that blocks a truly empty submit client-side, but the backend is the real
    // authority (it trims and rejects whitespace-only names), so this is what actually reaches it.
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    // Still in edit mode so the user can fix it and retry.
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
  });

  it('shows Session Ended if the save itself comes back 401 mid-edit', async () => {
    localStorage.setItem('token', 'about-to-die-token');
    localStorage.setItem('role', 'Student');
    global.fetch = vi.fn((url, options) => {
      if (options?.method === 'PUT') {
        return Promise.resolve({ ok: false, status: 401 });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(initialProfile) });
    });

    renderPage();
    await screen.findByText('jamie@example.com');

    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/session ended/i)).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
