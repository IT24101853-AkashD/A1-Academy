import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TeacherClassesPage from '../TeacherClassesPage';

const renderPage = () => render(
  <MemoryRouter initialEntries={['/teacher/classes']}>
    <Routes>
      <Route path="/teacher/classes" element={<TeacherClassesPage />} />
      <Route path="/teacher/classes/new" element={<div>Schedule Form</div>} />
      <Route path="/teacher/classes/:id" element={<div>Class Detail</div>} />
    </Routes>
  </MemoryRouter>
);

const sampleClasses = [
  { id: 1, name: 'Algebra Basics', categoryName: 'Mathematics', scheduledAt: '2027-01-01T10:00:00Z', capacity: 10, enrolledCount: 3, status: 'Active' },
  { id: 2, name: 'Old Class', categoryName: 'Mathematics', scheduledAt: '2026-01-01T10:00:00Z', capacity: 10, enrolledCount: 0, status: 'Cancelled' },
];

describe('TeacherClassesPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'teacher-token');
    vi.restoreAllMocks();
  });

  it('fetches and renders the classes as cards', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(sampleClasses) }));
    renderPage();

    expect(await screen.findByText('Algebra Basics')).toBeInTheDocument();
    expect(screen.getByText('Old Class')).toBeInTheDocument();
  });

  it('shows an empty state with a link to schedule a class when there are none', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) }));
    renderPage();

    expect(await screen.findByText(/no classes scheduled yet/i)).toBeInTheDocument();
  });

  it('cancelling requires a confirmation click before calling the cancel endpoint', async () => {
    global.fetch = vi.fn((url, options) => {
      if (options?.method === 'POST') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(sampleClasses) });
    });
    renderPage();

    await screen.findByText('Algebra Basics');
    const cancelButtons = screen.getAllByText('Cancel Class');
    fireEvent.click(cancelButtons[0]);

    expect(screen.queryByText('Confirm Cancel')).toBeInTheDocument();
    expect(global.fetch.mock.calls.some(([, opts]) => opts?.method === 'POST')).toBe(false);

    fireEvent.click(screen.getByText('Confirm Cancel'));

    await waitFor(() => {
      expect(global.fetch.mock.calls.some(([url, opts]) => opts?.method === 'POST' && url.includes('/1/cancel'))).toBe(true);
    });
  });
});
