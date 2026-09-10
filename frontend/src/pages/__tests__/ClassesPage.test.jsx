import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ClassesPage from '../ClassesPage';

const renderPage = (path = '/classes') => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/classes" element={<ClassesPage />} />
      <Route path="/student/categories" element={<div>Categories Stub</div>} />
    </Routes>
  </MemoryRouter>
);

describe('ClassesPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('prompts to choose a category when no categoryId is in the URL, without calling the API', async () => {
    global.fetch = vi.fn();

    renderPage('/classes');

    expect(await screen.findByText(/choose a category/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches the category and shows the coming-soon placeholder for it', async () => {
    localStorage.setItem('token', 'student-token');
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 7, name: 'Mathematics', description: 'Algebra and calculus.' }),
      })
    );

    renderPage('/classes?categoryId=7');

    expect(await screen.findByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/categories/7');
    expect(options.headers.Authorization).toBe('Bearer student-token');
  });

  it('shows a not-found message for a category that no longer exists', async () => {
    localStorage.setItem('token', 'student-token');
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }));

    renderPage('/classes?categoryId=999');

    expect(await screen.findByText(/category not found/i)).toBeInTheDocument();
  });

  it('shows Session Ended and clears localStorage when the request comes back 401', async () => {
    localStorage.setItem('token', 'now-dead-token');
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 401 }));

    renderPage('/classes?categoryId=7');

    expect(await screen.findByText(/session ended/i)).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
