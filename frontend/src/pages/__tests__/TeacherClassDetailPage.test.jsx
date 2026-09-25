import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TeacherClassDetailPage from '../TeacherClassDetailPage';

const renderPage = () => render(
  <MemoryRouter initialEntries={['/teacher/classes/1']}>
    <Routes>
      <Route path="/teacher/classes/:id" element={<TeacherClassDetailPage />} />
    </Routes>
  </MemoryRouter>
);

const sampleMaterials = [{ id: 1, fileName: 'notes.pdf', contentType: 'application/pdf', fileSizeBytes: 100, uploadedAt: '2026-01-01T00:00:00Z' }];
const sampleAssignments = [{ id: 1, title: 'Homework 1', description: 'Do it', dueAt: '2027-01-01T00:00:00Z', submissionCount: 2 }];
const sampleRoster = [{ id: 1, firstName: 'Alex', lastName: 'Rivera', email: 'alex@example.com', attendanceStatus: null }];

function mockFetch(overrides = {}) {
  return vi.fn((url, options) => {
    if (url.endsWith('/materials') && (!options || options.method === undefined)) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(overrides.materials ?? sampleMaterials) });
    }
    if (url.endsWith('/materials') && options?.method === 'POST') {
      return Promise.resolve({ ok: overrides.uploadOk ?? true, status: overrides.uploadStatus ?? 200, json: () => Promise.resolve({ message: overrides.uploadMessage }) });
    }
    if (url.endsWith('/assignments') && (!options || options.method === undefined)) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(overrides.assignments ?? sampleAssignments) });
    }
    if (url.endsWith('/assignments') && options?.method === 'POST') {
      return Promise.resolve({ ok: overrides.createAsgOk ?? true, status: overrides.createAsgStatus ?? 200, json: () => Promise.resolve({ message: overrides.createAsgMessage }) });
    }
    if (/\/assignments\/\d+\/submissions$/.test(url)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(overrides.submissions ?? [
          { id: 10, studentId: 1, studentName: 'Alex Rivera', studentEmail: 'alex@example.com', fileName: 'solution.pdf', status: 'Late', submittedAt: '2027-01-01T01:00:00Z' },
        ]),
      });
    }
    if (url.endsWith('/roster')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(overrides.roster ?? sampleRoster) });
    }
    if (url.endsWith('/attendance') && options?.method === 'POST') {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    }
    if (/\/materials\/\d+$/.test(url) && options?.method === 'DELETE') {
      return Promise.resolve({ ok: true, status: 204 });
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url} ${options?.method}`));
  });
}

describe('TeacherClassDetailPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'teacher-token');
    vi.restoreAllMocks();
  });

  it('loads and displays materials, assignments, and roster', async () => {
    global.fetch = mockFetch();
    renderPage();

    expect(await screen.findByText('notes.pdf')).toBeInTheDocument();
    expect(screen.getByText('Homework 1')).toBeInTheDocument();
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
  });

  it('deleting a material calls the delete endpoint and removes it from the list', async () => {
    global.fetch = mockFetch();
    renderPage();

    await screen.findByText('notes.pdf');
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(global.fetch.mock.calls.some(([url, opts]) => opts?.method === 'DELETE')).toBe(true);
    });
  });

  it('marking a student Present then saving calls the attendance endpoint with that status', async () => {
    global.fetch = mockFetch();
    renderPage();

    await screen.findByText('Alex Rivera');
    fireEvent.click(screen.getByText('Present'));
    fireEvent.click(screen.getByText('Save Attendance'));

    await waitFor(() => {
      const call = global.fetch.mock.calls.find(([url, opts]) => url.endsWith('/attendance') && opts?.method === 'POST');
      expect(call).toBeTruthy();
      const body = JSON.parse(call[1].body);
      expect(body.entries).toEqual([{ studentId: 1, status: 'Present' }]);
    });

    expect(await screen.findByText(/attendance saved/i)).toBeInTheDocument();
  });

  it('creating an assignment with a past-due error shows the server message', async () => {
    global.fetch = mockFetch({ createAsgOk: false, createAsgStatus: 400, createAsgMessage: 'Due date and time cannot be in the past.' });
    renderPage();

    await screen.findByText('Homework 1');
    fireEvent.change(screen.getByPlaceholderText('Assignment title'), { target: { value: 'New HW' } });
    fireEvent.change(screen.getByPlaceholderText('Description'), { target: { value: 'Details' } });
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2020-01-01' } });
    fireEvent.change(document.querySelector('input[type="time"]'), { target: { value: '10:00' } });
    fireEvent.click(screen.getByText('Create Assignment'));

    expect(await screen.findByText(/cannot be in the past/i)).toBeInTheDocument();
  });

  it('clicking View Submissions shows student submission with status badge', async () => {
    global.fetch = mockFetch();
    renderPage();

    await screen.findByText('Homework 1');
    const viewBtn = screen.getByText('View Submissions');
    fireEvent.click(viewBtn);

    expect(await screen.findByText('Student Submissions')).toBeInTheDocument();
    expect(screen.getByText('solution.pdf')).toBeInTheDocument();
    expect(screen.getByText('Late')).toBeInTheDocument();
  });
});
