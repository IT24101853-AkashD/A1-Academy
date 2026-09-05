import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminUsersPage from '../AdminUsersPage';

const renderPage = () => render(
  <MemoryRouter>
    <AdminUsersPage />
  </MemoryRouter>
);

const mockUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Student', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Teacher', status: 'Active' },
  { id: 3, name: 'Admin One', email: 'admin@example.com', role: 'Admin', status: 'Active' },
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
    // Scoped to the table: the role/status filter dropdowns also render an "Active" option.
    expect(within(screen.getByRole('table')).getAllByText('Active')).toHaveLength(3);

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

  it('the Pending Teacher Applications button requests role=Teacher&status=Pending', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    const pendingTeacher = { name: 'Pending Teacher', email: 'pending@example.com', role: 'Teacher', status: 'Pending' };
    global.fetch = vi.fn((url) => {
      const isFiltered = url.includes('role=Teacher') && url.includes('status=Pending');
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(pagedResponse(isFiltered ? [pendingTeacher] : mockUsers)),
      });
    });

    renderPage();
    await screen.findByText('John Doe');

    fireEvent.click(screen.getByRole('button', { name: /pending teacher applications/i }));

    await waitFor(() => expect(screen.getByText('Pending Teacher')).toBeInTheDocument());
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();

    const filteredCallUrl = global.fetch.mock.calls[1][0];
    expect(filteredCallUrl).toContain('role=Teacher');
    expect(filteredCallUrl).toContain('status=Pending');
    // A filter change resets back to page 1.
    expect(filteredCallUrl).toContain('page=1');
  });

  it('selecting a role/status from the dropdowns refetches with those query params', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(pagedResponse(mockUsers)) })
    );

    renderPage();
    await screen.findByText('John Doe');

    fireEvent.change(screen.getByLabelText(/filter by role/i), { target: { value: 'Teacher' } });
    await waitFor(() => expect(global.fetch.mock.calls[1][0]).toContain('role=Teacher'));

    fireEvent.change(screen.getByLabelText(/filter by status/i), { target: { value: 'Active' } });
    await waitFor(() => {
      const lastCallUrl = global.fetch.mock.calls.at(-1)[0];
      expect(lastCallUrl).toContain('role=Teacher');
      expect(lastCallUrl).toContain('status=Active');
    });
  });

  it('Clear filters resets both filters and refetches unfiltered', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(pagedResponse(mockUsers)) })
    );

    renderPage();
    await screen.findByText('John Doe');

    fireEvent.click(screen.getByRole('button', { name: /pending teacher applications/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    await waitFor(() => {
      const lastCallUrl = global.fetch.mock.calls.at(-1)[0];
      expect(lastCallUrl).not.toContain('role=');
      expect(lastCallUrl).not.toContain('status=');
    });
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it('shows an Approve button only for Pending rows', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    const pendingTeacher = { id: 4, name: 'Pending Teacher', email: 'pending@example.com', role: 'Teacher', status: 'Pending' };
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(pagedResponse([...mockUsers, pendingTeacher])) })
    );

    renderPage();
    await screen.findByText('Pending Teacher');

    // Only one row is Pending, so there should be exactly one Approve button.
    expect(screen.getAllByRole('button', { name: /^approve$/i })).toHaveLength(1);
  });

  it('clicking Approve calls the approve endpoint and flips the row to Active', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    const pendingTeacher = { id: 4, name: 'Pending Teacher', email: 'pending@example.com', role: 'Teacher', status: 'Pending' };
    const approvedTeacher = { ...pendingTeacher, status: 'Active' };

    global.fetch = vi.fn((url, options) => {
      if (options?.method === 'PATCH') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(approvedTeacher) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(pagedResponse([...mockUsers, pendingTeacher])) });
    });

    renderPage();
    await screen.findByText('Pending Teacher');

    fireEvent.click(screen.getByRole('button', { name: /^approve$/i }));

    await waitFor(() => expect(screen.queryByRole('button', { name: /^approve$/i })).not.toBeInTheDocument());

    // Hit the right endpoint with PATCH and the admin's auth header.
    const patchCall = global.fetch.mock.calls.find(([, options]) => options?.method === 'PATCH');
    expect(patchCall[0]).toContain('/api/users/4/approve');
    expect(patchCall[1].headers.Authorization).toBe('Bearer admin-token');

    // Row now shows Active instead of Pending, still no Approve button on it.
    const row = screen.getByText('Pending Teacher').closest('tr');
    expect(within(row).getByText('Active')).toBeInTheDocument();
  });

  it('shows an error message and re-enables Approve if the approval request fails', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    const pendingTeacher = { id: 4, name: 'Pending Teacher', email: 'pending@example.com', role: 'Teacher', status: 'Pending' };

    global.fetch = vi.fn((url, options) => {
      if (options?.method === 'PATCH') {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(pagedResponse([...mockUsers, pendingTeacher])) });
    });

    renderPage();
    await screen.findByText('Pending Teacher');

    fireEvent.click(screen.getByRole('button', { name: /^approve$/i }));

    expect(await screen.findByText(/could not approve/i)).toBeInTheDocument();
    // Still Pending, button back to normal so the admin can retry.
    expect(screen.getByRole('button', { name: /^approve$/i })).not.toBeDisabled();
  });

  it('removes the row entirely when approving from the Pending-only filtered view', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    const pendingTeacher = { id: 4, name: 'Pending Teacher', email: 'pending@example.com', role: 'Teacher', status: 'Pending' };
    const approvedTeacher = { ...pendingTeacher, status: 'Active' };

    global.fetch = vi.fn((url, options) => {
      if (options?.method === 'PATCH') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(approvedTeacher) });
      }
      const isPendingFilter = url.includes('role=Teacher') && url.includes('status=Pending');
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(pagedResponse(isPendingFilter ? [pendingTeacher] : mockUsers)),
      });
    });

    renderPage();
    await screen.findByText('John Doe');

    // Switch to the Pending Teacher Applications view first.
    fireEvent.click(screen.getByRole('button', { name: /pending teacher applications/i }));
    await screen.findByText('Pending Teacher');

    fireEvent.click(screen.getByRole('button', { name: /^approve$/i }));

    // Once approved it no longer belongs in a status=Pending view, so the row disappears
    // instead of just flipping its badge.
    await waitFor(() => expect(screen.queryByText('Pending Teacher')).not.toBeInTheDocument());
  });

  it('shows Approve and Reject on Pending rows, Deactivate on Active rows, Reactivate on Deactivated rows, and nothing on Rejected', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    const allStatuses = [
      { id: 10, name: 'Pending Person', email: 'pendingperson@example.com', role: 'Teacher', status: 'Pending' },
      { id: 11, name: 'Active Person', email: 'activeperson@example.com', role: 'Student', status: 'Active' },
      { id: 12, name: 'Deactivated Person', email: 'deactivatedperson@example.com', role: 'Student', status: 'Deactivated' },
      { id: 13, name: 'Rejected Person', email: 'rejectedperson@example.com', role: 'Teacher', status: 'Rejected' },
    ];
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(pagedResponse(allStatuses)) })
    );

    renderPage();
    await screen.findByText('Pending Person');

    expect(within(screen.getByText('Pending Person').closest('tr')).getByRole('button', { name: /^approve$/i })).toBeInTheDocument();
    expect(within(screen.getByText('Pending Person').closest('tr')).getByRole('button', { name: /^reject$/i })).toBeInTheDocument();

    expect(within(screen.getByText('Active Person').closest('tr')).getByRole('button', { name: /^deactivate$/i })).toBeInTheDocument();

    expect(within(screen.getByText('Deactivated Person').closest('tr')).getByRole('button', { name: /^reactivate$/i })).toBeInTheDocument();

    // Rejected is a dead end - no action button on that row at all.
    expect(within(screen.getByText('Rejected Person').closest('tr')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('clicking Reject calls the reject endpoint and flips the row to Rejected', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    const pendingTeacher = { id: 20, name: 'Turned Down', email: 'turneddown@example.com', role: 'Teacher', status: 'Pending' };
    const rejectedTeacher = { ...pendingTeacher, status: 'Rejected' };

    global.fetch = vi.fn((url, options) => {
      if (options?.method === 'PATCH') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(rejectedTeacher) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(pagedResponse([pendingTeacher])) });
    });

    renderPage();
    await screen.findByText('Turned Down');

    fireEvent.click(screen.getByRole('button', { name: /^reject$/i }));

    await waitFor(() => {
      const row = screen.getByText('Turned Down').closest('tr');
      expect(within(row).getByText('Rejected')).toBeInTheDocument();
    });

    const patchCall = global.fetch.mock.calls.find(([, options]) => options?.method === 'PATCH');
    expect(patchCall[0]).toContain('/api/users/20/reject');
  });

  it('clicking Deactivate calls the deactivate endpoint and flips the row to Deactivated', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    const activeStudent = { id: 21, name: 'Switch Off', email: 'switchoff@example.com', role: 'Student', status: 'Active' };
    const deactivatedStudent = { ...activeStudent, status: 'Deactivated' };

    global.fetch = vi.fn((url, options) => {
      if (options?.method === 'PATCH') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(deactivatedStudent) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(pagedResponse([activeStudent])) });
    });

    renderPage();
    await screen.findByText('Switch Off');

    fireEvent.click(screen.getByRole('button', { name: /^deactivate$/i }));

    await waitFor(() => {
      const row = screen.getByText('Switch Off').closest('tr');
      expect(within(row).getByText('Deactivated')).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: /^reactivate$/i })).toBeInTheDocument();
    });

    const patchCall = global.fetch.mock.calls.find(([, options]) => options?.method === 'PATCH');
    expect(patchCall[0]).toContain('/api/users/21/deactivate');
  });

  it('clicking Reactivate calls the reactivate endpoint and flips the row back to Active', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    const deactivatedStudent = { id: 22, name: 'Switch Back On', email: 'switchbackon@example.com', role: 'Student', status: 'Deactivated' };
    const activeStudent = { ...deactivatedStudent, status: 'Active' };

    global.fetch = vi.fn((url, options) => {
      if (options?.method === 'PATCH') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(activeStudent) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(pagedResponse([deactivatedStudent])) });
    });

    renderPage();
    await screen.findByText('Switch Back On');

    fireEvent.click(screen.getByRole('button', { name: /^reactivate$/i }));

    await waitFor(() => {
      const row = screen.getByText('Switch Back On').closest('tr');
      expect(within(row).getByText('Active')).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: /^deactivate$/i })).toBeInTheDocument();
    });

    const patchCall = global.fetch.mock.calls.find(([, options]) => options?.method === 'PATCH');
    expect(patchCall[0]).toContain('/api/users/22/reactivate');
  });

  it('shows a deactivate-specific error message if the deactivate request fails', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    const activeStudent = { id: 23, name: 'Wont Switch Off', email: 'wontswitchoff@example.com', role: 'Student', status: 'Active' };

    global.fetch = vi.fn((url, options) => {
      if (options?.method === 'PATCH') {
        return Promise.resolve({ ok: false, status: 400 });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(pagedResponse([activeStudent])) });
    });

    renderPage();
    await screen.findByText('Wont Switch Off');

    fireEvent.click(screen.getByRole('button', { name: /^deactivate$/i }));

    expect(await screen.findByText(/could not deactivate/i)).toBeInTheDocument();
    // Still Active, button back to normal so the admin can retry.
    expect(screen.getByRole('button', { name: /^deactivate$/i })).not.toBeDisabled();
  });
});
