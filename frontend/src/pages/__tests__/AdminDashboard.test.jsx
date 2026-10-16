import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../AdminDashboard';

// Answers each dashboard request by URL. `state` is read on every call, so a test can change
// what the server "returns" between calls (e.g. after an approval).
const mockApi = (state) => {
  global.fetch = vi.fn((url, options = {}) => {
    const reply = (body, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) });
    if (url.includes('/api/users/stats')) return reply(state.stats);
    if (url.includes('/api/users/growth-report')) return reply({ totalStudents: 2, totalTeachers: 1 });
    if (url.includes('/api/auth/me')) return reply({ firstName: 'Ada' });
    if (options.method === 'PATCH') return reply({});
    if (url.includes('/api/users?')) return reply({ items: state.pending, totalCount: state.pending.length });
    return reply({}, false);
  });
};

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>
  );

describe('AdminDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'admin-jwt');
    localStorage.setItem('role', 'Admin');
    vi.restoreAllMocks();
  });

  it('shows live figures from /api/users/stats instead of fixed numbers', async () => {
    mockApi({
      stats: { totalUsers: 1532, newUsersLast30Days: 7, activeTeachers: 12, newTeachersLast30Days: 0, pendingApprovals: 0, totalCategories: 9 },
      pending: [],
    });

    renderDashboard();

    expect(await screen.findByText('1,532')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('+7 this month')).toBeInTheDocument();
    expect(screen.queryByText('Action Needed')).not.toBeInTheDocument();
    expect(screen.queryByText('1,248')).not.toBeInTheDocument();
  });

  it('refreshes the figures after a teacher is approved', async () => {
    const state = {
      stats: { totalUsers: 10, newUsersLast30Days: 0, activeTeachers: 3, newTeachersLast30Days: 0, pendingApprovals: 1, totalCategories: 4 },
      pending: [{ id: 5, name: 'Grace Hopper', email: 'grace@example.com' }],
    };
    mockApi(state);

    renderDashboard();
    expect(await screen.findByText('Action Needed')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    state.stats = { ...state.stats, activeTeachers: 4, pendingApprovals: 0 };
    state.pending = [];
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('4')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Action Needed')).not.toBeInTheDocument());
  });

  it('shows a dash, not a made-up number, until the figures arrive', () => {
    global.fetch = vi.fn(() => new Promise(() => {}));

    renderDashboard();

    expect(screen.getAllByText('—')).toHaveLength(4);
  });
});
