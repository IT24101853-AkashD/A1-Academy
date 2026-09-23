import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ScheduleClassPage from '../ScheduleClassPage';

function TeacherClassesStub() {
  return <div>Teacher Classes List</div>;
}

const renderPage = () => render(
  <MemoryRouter initialEntries={['/teacher/classes/new']}>
    <Routes>
      <Route path="/teacher/classes/new" element={<ScheduleClassPage />} />
      <Route path="/teacher/classes" element={<TeacherClassesStub />} />
    </Routes>
  </MemoryRouter>
);

function mockFetch({ categories = [{ id: 1, name: 'Mathematics' }], scheduleOk = true, scheduleStatus = 201, scheduleBody = {} } = {}) {
  return vi.fn((url, options) => {
    if (url.includes('/api/categories')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(categories) });
    }
    if (url.includes('/api/teacher/classes') && options?.method === 'POST') {
      return Promise.resolve({ ok: scheduleOk, status: scheduleStatus, json: () => Promise.resolve(scheduleBody) });
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
}

describe('ScheduleClassPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'teacher-token');
    vi.restoreAllMocks();
  });

  it('fetches categories and pre-selects the first one', async () => {
    global.fetch = mockFetch();
    renderPage();

    expect(await screen.findByText('Schedule a Class', { exact: false })).toBeInTheDocument();
  });

  it('submits a valid future date/time and navigates to the classes list on success', async () => {
    global.fetch = mockFetch();
    renderPage();

    await screen.findByText(/schedule a class/i);
    fireEvent.change(screen.getByPlaceholderText(/e.g. algebra basics/i), { target: { value: 'Algebra Basics' } });
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2027-01-01' } });
    fireEvent.change(document.querySelector('input[type="time"]'), { target: { value: '10:00' } });

    fireEvent.click(screen.getByRole('button', { name: /schedule class/i }));

    expect(await screen.findByText('Teacher Classes List')).toBeInTheDocument();
  });

  it('shows a validation error and does not navigate when the server rejects a past date', async () => {
    global.fetch = mockFetch({ scheduleOk: false, scheduleStatus: 400, scheduleBody: { message: 'Class date and time must be in the future.' } });
    renderPage();

    await screen.findByText(/schedule a class/i);
    fireEvent.change(screen.getByPlaceholderText(/e.g. algebra basics/i), { target: { value: 'Algebra Basics' } });
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2020-01-01' } });
    fireEvent.change(document.querySelector('input[type="time"]'), { target: { value: '10:00' } });

    fireEvent.click(screen.getByRole('button', { name: /schedule class/i }));

    expect(await screen.findByText(/must be in the future/i)).toBeInTheDocument();
    expect(screen.queryByText('Teacher Classes List')).not.toBeInTheDocument();
  });

  it('shows a client-side error without calling the API when the name is empty', async () => {
    global.fetch = mockFetch();
    renderPage();

    await screen.findByText(/schedule a class/i);
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2027-01-01' } });
    fireEvent.change(document.querySelector('input[type="time"]'), { target: { value: '10:00' } });

    const callsBefore = global.fetch.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /schedule class/i }));

    expect(await screen.findByText(/class name is required/i)).toBeInTheDocument();
    expect(global.fetch.mock.calls.length).toBe(callsBefore);
  });
});
