import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SubmissionsPanel from '../teacher/SubmissionsPanel';

const roster = [
  { id: 1, firstName: 'Alex', lastName: 'Rivera', email: 'alex@example.com' },
  { id: 2, firstName: 'Bea', lastName: 'Chen', email: 'bea@example.com' },
  { id: 3, firstName: 'Cara', lastName: 'Diaz', email: 'cara@example.com' },
];
const submissions = [
  { id: 10, studentId: 1, studentName: 'Alex Rivera', studentEmail: 'alex@example.com', fileName: 'alex.pdf', status: 'Submitted', submittedAt: '2027-01-01T01:00:00Z', grade: null },
  { id: 11, studentId: 2, studentName: 'Bea Chen', studentEmail: 'bea@example.com', fileName: 'bea.pdf', status: 'Late', submittedAt: '2027-01-02T01:00:00Z', grade: 80 },
];

const renderPanel = (props = {}) => render(
  <SubmissionsPanel submissions={submissions} roster={roster} onDownload={vi.fn()} onSaveGrade={vi.fn(() => Promise.resolve(null))} {...props} />
);

describe('SubmissionsPanel', () => {
  it('lists every enrolled student, marking the ones who have not submitted', () => {
    renderPanel();

    expect(screen.getByText((_, el) => el?.tagName === 'P' && /2 of 3 submitted/.test(el.textContent))).toBeInTheDocument();
    expect(screen.getByText('Cara Diaz')).toBeInTheDocument();
    expect(screen.getByText('Not submitted')).toBeInTheDocument();
    expect(screen.getByText('alex.pdf')).toBeInTheDocument();
    expect(screen.getByText('80/100')).toBeInTheDocument();
  });

  it('filters to students who still need a grade, and to missing students', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /to grade/i }));
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
    expect(screen.queryByText('Bea Chen')).not.toBeInTheDocument();
    expect(screen.queryByText('Cara Diaz')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /missing/i }));
    expect(screen.getByText('Cara Diaz')).toBeInTheDocument();
    expect(screen.queryByText('Alex Rivera')).not.toBeInTheDocument();
  });

  it('searches by student name or email', () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText(/search submissions/i), { target: { value: 'bea@' } });
    expect(screen.getByText('Bea Chen')).toBeInTheDocument();
    expect(screen.queryByText('Alex Rivera')).not.toBeInTheDocument();
  });

  it('saves a grade through onSaveGrade and rejects out-of-range scores', async () => {
    const onSaveGrade = vi.fn(() => Promise.resolve(null));
    renderPanel({ onSaveGrade });

    fireEvent.click(screen.getByRole('button', { name: 'Grade' }));
    fireEvent.change(screen.getByLabelText(/score/i), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/between 0 and 100/i)).toBeInTheDocument();
    expect(onSaveGrade).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/score/i), { target: { value: '92' } });
    fireEvent.change(screen.getByLabelText(/feedback/i), { target: { value: 'Nice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSaveGrade).toHaveBeenCalledWith(submissions[0], 92, 'Nice'));
  });
});
