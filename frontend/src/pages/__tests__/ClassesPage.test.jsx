import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ClassesPage from '../ClassesPage';

const renderPage = (path = '/classes') => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/classes" element={<ClassesPage />} />
    </Routes>
  </MemoryRouter>
);

const sampleClasses = [
  { id: 1, name: 'Algebra Basics', categoryId: 7, categoryName: 'Mathematics', teacherName: 'Dr. Elena Rostova', scheduledAt: '2026-10-01T14:00:00Z', capacity: 10, enrolledCount: 3, status: 'Active', isEnrolled: false },
  { id: 2, name: 'Calculus II', categoryId: 7, categoryName: 'Mathematics', teacherName: 'Prof. Sam Chen', scheduledAt: '2026-10-02T09:00:00Z', capacity: 2, enrolledCount: 2, status: 'Active', isEnrolled: false },
  { id: 3, name: 'Intro to Physics', categoryId: 8, categoryName: 'Science', teacherName: 'Prof. Maria Lopez', scheduledAt: '2026-10-03T11:00:00Z', capacity: 5, enrolledCount: 1, status: 'Cancelled', isEnrolled: false },
];

function mockFetch({ classes = sampleClasses, categoriesStatus = 200, classesStatus = 200 } = {}) {
  return vi.fn((url) => {
    if (url.includes('/api/categories')) {
      return Promise.resolve({
        ok: categoriesStatus === 200,
        status: categoriesStatus,
        json: () => Promise.resolve([{ id: 7, name: 'Mathematics' }, { id: 8, name: 'Science' }]),
      });
    }
    if (url.includes('/api/student/classes')) {
      return Promise.resolve({
        ok: classesStatus === 200,
        status: classesStatus,
        json: () => Promise.resolve(classes),
      });
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
}

describe('ClassesPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'student-token');
    vi.restoreAllMocks();
  });

  it('fetches and renders the class list as cards', async () => {
    global.fetch = mockFetch();
    renderPage();

    expect(await screen.findByText('Algebra Basics')).toBeInTheDocument();
    expect(screen.getByText('Dr. Elena Rostova')).toBeInTheDocument();
    expect(screen.getByText('Prof. Sam Chen')).toBeInTheDocument();
  });

  it('shows remaining seats for an open class and "Class Full" for a class at capacity', async () => {
    global.fetch = mockFetch();
    renderPage();

    expect(await screen.findByText('7 / 10 seats left')).toBeInTheDocument();
    expect(screen.getAllByText('Class Full').length).toBeGreaterThan(0);
  });

  it('shows a Cancelled badge for a cancelled class', async () => {
    global.fetch = mockFetch();
    renderPage();

    expect(await screen.findAllByText('Class Cancelled')).not.toHaveLength(0);
  });

  it('filters the visible classes as you type a teacher name', async () => {
    global.fetch = mockFetch();
    renderPage();

    await screen.findByText('Prof. Sam Chen');

    fireEvent.change(screen.getByPlaceholderText(/search by teacher name/i), {
      target: { value: 'Elena' },
    });

    expect(screen.queryByText('Prof. Sam Chen')).not.toBeInTheDocument();
    expect(screen.getAllByText('Dr. Elena Rostova').length).toBeGreaterThan(0);
  });

  it('shows the empty state when no class matches the search, and Reset Filters clears it', async () => {
    global.fetch = mockFetch();
    renderPage();

    await screen.findByText('Prof. Sam Chen');

    fireEvent.change(screen.getByPlaceholderText(/search by teacher name/i), {
      target: { value: 'nobody teaches this' },
    });

    expect(await screen.findByText(/no classes found/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/reset filters/i));

    expect(await screen.findByText('Prof. Sam Chen')).toBeInTheDocument();
  });

  it('re-fetches classes scoped to the selected category', async () => {
    global.fetch = mockFetch();
    renderPage();

    await screen.findByText('Prof. Sam Chen');
    const callsBefore = global.fetch.mock.calls.length;

    fireEvent.change(screen.getByDisplayValue(/all subjects/i), { target: { value: '8' } });

    await screen.findByText(/live class schedules/i);
    const classesCalls = global.fetch.mock.calls.slice(callsBefore).filter(([url]) => url.includes('/api/student/classes'));
    expect(classesCalls[0][0]).toContain('categoryId=8');
  });

  it('enrolling in an open class calls the enrol endpoint and flips the card to Enrolled', async () => {
    let enrolled = false;
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/categories')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
      }
      if (url.endsWith('/enroll')) {
        enrolled = true;
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      }
      if (url.includes('/api/student/classes')) {
        const list = enrolled
          ? sampleClasses.map((c) => (c.id === 1 ? { ...c, isEnrolled: true, enrolledCount: 4 } : c))
          : sampleClasses;
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(list) });
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url} ${options?.method}`));
    });

    renderPage();

    const enrolButton = await screen.findByText('Enrol Now');
    fireEvent.click(enrolButton);

    await waitFor(() => {
      expect(screen.getAllByText('Enrolled').length).toBeGreaterThan(0);
    });
    const enrollCall = global.fetch.mock.calls.find(([url]) => url.endsWith('/enroll'));
    expect(enrollCall[1].method).toBe('POST');
  });

  it('shows Session Ended and clears localStorage when the classes request comes back 401', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/categories')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: false, status: 401 });
    });

    renderPage();

    expect(await screen.findByText(/session ended/i)).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
