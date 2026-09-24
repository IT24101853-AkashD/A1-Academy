import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import StudentClassDetailPage from '../StudentClassDetailPage';

const renderPage = () => render(
  <MemoryRouter initialEntries={['/student/classes/1']}>
    <Routes>
      <Route path="/student/classes/:id" element={<StudentClassDetailPage />} />
    </Routes>
  </MemoryRouter>
);

const sampleMaterials = [{ id: 1, fileName: 'notes.pdf' }];
const sampleAssignments = [
  { id: 1, title: 'Homework 1', description: 'Do it', dueAt: '2027-01-01T00:00:00Z', mySubmissionStatus: null },
  { id: 2, title: 'Homework 2', description: 'Done already', dueAt: '2027-01-01T00:00:00Z', mySubmissionStatus: 'Submitted' },
];

function mockFetch({ materialsStatus = 200, assignmentsStatus = 200, submitOk = true, submitStatus = 200 } = {}) {
  return vi.fn((url, options) => {
    if (url.endsWith('/materials')) {
      return Promise.resolve({
        ok: materialsStatus === 200,
        status: materialsStatus,
        json: () => Promise.resolve(sampleMaterials),
      });
    }
    if (url.endsWith('/materials/1/download')) {
      return Promise.resolve({ ok: true, status: 200, blob: () => Promise.resolve(new Blob(['data'])) });
    }
    if (url.endsWith('/assignments')) {
      return Promise.resolve({
        ok: assignmentsStatus === 200,
        status: assignmentsStatus,
        json: () => Promise.resolve(sampleAssignments),
      });
    }
    if (url.includes('/submissions') && options?.method === 'POST') {
      return Promise.resolve({ ok: submitOk, status: submitStatus, json: () => Promise.resolve({}) });
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
}

describe('StudentClassDetailPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'student-token');
    vi.restoreAllMocks();
    window.URL.createObjectURL = vi.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = vi.fn();
  });

  it('lists materials and assignments, showing a submission status badge where one exists', async () => {
    global.fetch = mockFetch();
    renderPage();

    expect(await screen.findByText('notes.pdf')).toBeInTheDocument();
    expect(screen.getByText('Homework 1')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
  });

  it('only shows a submit form for assignments without an existing submission', async () => {
    global.fetch = mockFetch();
    renderPage();

    await screen.findByText('Homework 1');
    const submitButtons = screen.getAllByText('Submit');
    expect(submitButtons).toHaveLength(1);
  });

  it('clicking Download fetches the file and triggers a browser download', async () => {
    global.fetch = mockFetch();
    renderPage();

    fireEvent.click(await screen.findByText('Download'));

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it('shows Access Denied when the materials request comes back 403', async () => {
    global.fetch = mockFetch({ materialsStatus: 403 });
    renderPage();

    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
  });
});
