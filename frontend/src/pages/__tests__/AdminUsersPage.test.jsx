import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

// Shape returned by GET /api/users?page=&pageSize= once pagination was added server-side.
const pagedResponse = (items, overrides = {}) => ({
  items,
  page: 1,
  pageSize: 10,
  totalCount: items.length,
  totalPages: 1,
  ...overrides,
});

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
        json: () => Promise.resolve(pagedResponse(mockUsers)),
      })
    );

    renderPage();

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Admin One')).toBeInTheDocument();
    expect(screen.getAllByText('Active')).toHaveLength(3);

    // Called with an Authorization header carrying the admin's token.
    const [url, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer admin-token');
    // Requests page 1 by default.
    expect(url).toContain('page=1');
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

  it('does not render pagination controls when everything fits on one page', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(pagedResponse(mockUsers, { totalPages: 1 })),
      })
    );

    renderPage();

    await screen.findByText('John Doe');
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
  });

  it('renders page numbers and Next/Previous controls, and fetches the next page on click', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    global.fetch = vi.fn((url) => {
      const isPageTwo = url.includes('page=2');
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve(
            pagedResponse(isPageTwo ? [mockUsers[2]] : mockUsers.slice(0, 2), {
              page: isPageTwo ? 2 : 1,
              pageSize: 2,
              totalCount: 3,
              totalPages: 2,
            })
          ),
      });
    });

    renderPage();

    await screen.findByText('John Doe');
    expect(screen.getByText(/showing page 1 of 2/i)).toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: /^next$/i });
    const previousButton = screen.getByRole('button', { name: /^previous$/i });
    expect(previousButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);

    await waitFor(() => expect(screen.getByText(/showing page 2 of 2/i)).toBeInTheDocument());
    expect(screen.getByText('Admin One')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();

    // Second call requested page 2.
    const secondCallUrl = global.fetch.mock.calls[1][0];
    expect(secondCallUrl).toContain('page=2');
  });
});
