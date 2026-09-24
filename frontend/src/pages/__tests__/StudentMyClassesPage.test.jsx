import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import StudentMyClassesPage from '../StudentMyClassesPage';

const renderPage = () => render(
  <MemoryRouter initialEntries={['/student/my-classes']}>
    <Routes>
      <Route path="/student/my-classes" element={<StudentMyClassesPage />} />
      <Route path="/student/classes/:id" element={<div>Class Detail</div>} />
      <Route path="/classes" element={<div>Browse Classes Page</div>} />
    </Routes>
  </MemoryRouter>
);

describe('StudentMyClassesPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'student-token');
    vi.restoreAllMocks();
  });

  it('fetches and renders enrolled classes, including a Cancelled badge', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve([
        { id: 1, name: 'Algebra Basics', categoryName: 'Mathematics', teacherName: 'Dr. Rostova', scheduledAt: '2027-01-01T10:00:00Z', status: 'Active' },
        { id: 2, name: 'Old Class', categoryName: 'Mathematics', teacherName: 'Dr. Rostova', scheduledAt: '2026-01-01T10:00:00Z', status: 'Cancelled' },
      ]),
    }));
    renderPage();

    expect(await screen.findByText('Algebra Basics')).toBeInTheDocument();
    expect(screen.getByText('Old Class')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/student/classes/mine');
    expect(options.headers.Authorization).toBe('Bearer student-token');
  });

  it('shows an empty state with a link to browse classes when there are none', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) }));
    renderPage();

    expect(await screen.findByText(/no classes yet/i)).toBeInTheDocument();
  });

  it('shows Session Ended and clears localStorage when the request comes back 401', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 401 }));
    renderPage();

    expect(await screen.findByText(/session ended/i)).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
