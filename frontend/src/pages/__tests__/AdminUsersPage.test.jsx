import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminUsersPage from '../AdminUsersPage';

const renderPage = () => render(
  <MemoryRouter>
    <AdminUsersPage />
  </MemoryRouter>
);

const mockUsers = [
  { name: 'John Doe', email: 'john@example.com', role: 'Student', status: 'Active' },
  { name: 'Jane Smith', email: 'jane@example.com', role: 'Teacher', status: 'Active' },
  { name: 'Admin One', email: 'admin@example.com', role: 'Admin', status: 'Active' },
];

describe('AdminUsersPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('shows Access Denied and never calls the API for a Student', async () => {
    localStorage.setItem('role', 'Student');
    localStorage.setItem('token', 'student-token');
    global.fetch = vi.fn();

    renderPage();

    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows Access Denied and never calls the API for a Teacher', async () => {
    localStorage.setItem('role', 'Teacher');
    localStorage.setItem('token', 'teacher-token');
    global.fetch = vi.fn();

    renderPage();

    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows Access Denied with no token/role at all (logged out)', async () => {
    global.fetch = vi.fn();

    renderPage();

    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches and renders the directory table for an Admin', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUsers),
      })
    );

    renderPage();

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Admin One')).toBeInTheDocument();
    expect(screen.getAllByText('Active')).toHaveLength(3);

    // Called with an Authorization header carrying the admin's token.
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer admin-token');
  });

  it('falls back to Access Denied if the backend itself rejects the request (403)', async () => {
    // Covers a tampered/stale localStorage role: the UI trusts localStorage optimistically,
    // but the server-side check in UsersController is what actually decides access.
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'not-really-an-admin-token');
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 403 })
    );

    renderPage();

    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
  });
});
