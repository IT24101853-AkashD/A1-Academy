import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import StudentCategoriesPage from '../StudentCategoriesPage';

// Stand-in for the real ClassesPage - just enough to observe which categoryId the click
// actually navigated to, without pulling that page's own fetch/rendering into this suite.
function ClassesRouteStub() {
  const [searchParams] = useSearchParams();
  return <div>Classes for category {searchParams.get('categoryId')}</div>;
}

const renderPage = () => render(
  <MemoryRouter initialEntries={['/student/categories']}>
    <Routes>
      <Route path="/student/categories" element={<StudentCategoriesPage />} />
      <Route path="/classes" element={<ClassesRouteStub />} />
    </Routes>
  </MemoryRouter>
);

describe('StudentCategoriesPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
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

  it('fetches and renders the active categories as a grid for a Student', async () => {
    localStorage.setItem('role', 'Student');
    localStorage.setItem('token', 'student-token');
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([
          { id: 1, name: 'Mathematics', description: 'Algebra and calculus.' },
          { id: 2, name: 'Science', description: 'Physics, chemistry, and biology.' },
        ]),
      })
    );

    renderPage();

    expect(await screen.findByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('Algebra and calculus.')).toBeInTheDocument();
    expect(screen.getByText('Science')).toBeInTheDocument();
    expect(screen.getByText('Physics, chemistry, and biology.')).toBeInTheDocument();

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/categories');
    expect(options.headers.Authorization).toBe('Bearer student-token');
  });

  it('shows an empty-state message when there are no categories yet', async () => {
    localStorage.setItem('role', 'Student');
    localStorage.setItem('token', 'student-token');
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) }));

    renderPage();

    expect(await screen.findByText(/no categories yet/i)).toBeInTheDocument();
  });

  it('shows Session Ended and clears localStorage when the request comes back 401', async () => {
    localStorage.setItem('role', 'Student');
    localStorage.setItem('token', 'now-dead-token');
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 401 }));

    renderPage();

    expect(await screen.findByText(/session ended/i)).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('role')).toBeNull();
  });

  it('clicking a category card navigates to the filtered classes route for that category', async () => {
    localStorage.setItem('role', 'Student');
    localStorage.setItem('token', 'student-token');
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{ id: 7, name: 'Mathematics', description: 'Algebra and calculus.' }]),
      })
    );

    renderPage();

    const card = await screen.findByText('Mathematics');
    fireEvent.click(card);

    expect(await screen.findByText('Classes for category 7')).toBeInTheDocument();
  });
});
