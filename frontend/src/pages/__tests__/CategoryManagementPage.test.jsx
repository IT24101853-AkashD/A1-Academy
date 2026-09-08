import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CategoryManagementPage from '../CategoryManagementPage';

const renderPage = () => render(
  <MemoryRouter>
    <CategoryManagementPage />
  </MemoryRouter>
);

describe('CategoryManagementPage', () => {
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

  it('shows Access Denied with no token/role at all (logged out)', async () => {
    global.fetch = vi.fn();

    renderPage();

    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches and renders the existing categories for an Admin', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
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
    expect(screen.getByText('Science')).toBeInTheDocument();

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/categories');
    expect(options.headers.Authorization).toBe('Bearer admin-token');
  });

  it('shows an empty-state message when there are no categories yet', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) }));

    renderPage();

    expect(await screen.findByText(/no categories yet/i)).toBeInTheDocument();
  });

  it('falls back to Access Denied if the backend itself rejects the request (403)', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'not-really-an-admin-token');
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 403 }));

    renderPage();

    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
  });

  it('shows Session Ended and clears localStorage when the initial request comes back 401', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'now-dead-token');
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 401 }));

    renderPage();

    expect(await screen.findByText(/session ended/i)).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('role')).toBeNull();
  });

  it('creating a category posts to the API and adds it to the list immediately', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');
    const created = { id: 3, name: 'Computer Science', description: 'Programming and algorithms.' };

    global.fetch = vi.fn((url, options) => {
      if (options?.method === 'POST') {
        return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve(created) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    });

    renderPage();
    await screen.findByText(/no categories yet/i);

    fireEvent.change(screen.getByLabelText(/category name/i), { target: { value: 'Computer Science' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Programming and algorithms.' } });
    fireEvent.click(screen.getByRole('button', { name: /create category/i }));

    await waitFor(() => expect(screen.getByText(/available immediately/i)).toBeInTheDocument());
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
    expect(screen.getByText('Programming and algorithms.')).toBeInTheDocument();
    // Form clears after a successful save.
    expect(screen.getByLabelText(/category name/i)).toHaveValue('');

    const postCall = global.fetch.mock.calls.find(([, options]) => options?.method === 'POST');
    expect(postCall[1].headers.Authorization).toBe('Bearer admin-token');
    expect(JSON.parse(postCall[1].body)).toEqual({ name: 'Computer Science', description: 'Programming and algorithms.' });
  });

  it('shows the backend validation message on a duplicate name and does not clear the form', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');

    global.fetch = vi.fn((url, options) => {
      if (options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ message: 'A category with this name already exists.' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{ id: 1, name: 'Mathematics', description: 'Existing.' }]),
      });
    });

    renderPage();
    await screen.findByText('Mathematics');

    fireEvent.change(screen.getByLabelText(/category name/i), { target: { value: 'Mathematics' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A duplicate.' } });
    fireEvent.click(screen.getByRole('button', { name: /create category/i }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category name/i)).toHaveValue('Mathematics');
  });

  it('shows Session Ended if creation itself comes back 401 mid-form', async () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'about-to-die-token');

    global.fetch = vi.fn((url, options) => {
      if (options?.method === 'POST') {
        return Promise.resolve({ ok: false, status: 401 });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    });

    renderPage();
    await screen.findByText(/no categories yet/i);

    fireEvent.change(screen.getByLabelText(/category name/i), { target: { value: 'Anything' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Anything.' } });
    fireEvent.click(screen.getByRole('button', { name: /create category/i }));

    expect(await screen.findByText(/session ended/i)).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
