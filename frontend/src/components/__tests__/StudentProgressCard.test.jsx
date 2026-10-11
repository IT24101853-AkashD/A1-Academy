import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import StudentProgressCard from '../student/StudentProgressCard';

describe('StudentProgressCard', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'valid-student-jwt');
    vi.restoreAllMocks();
  });

  it('renders overall attendance percentage and average grade accurately when data is available', async () => {
    const mockProgress = {
      studentId: 42,
      enrolledClassesCount: 3,
      overallAttendancePercentage: 85.5,
      overallAverageGrade: 92.0,
      totalAttendanceRecords: 20,
      presentAttendanceRecords: 17,
      totalSubmissionsCount: 5,
      gradedSubmissionsCount: 4,
      classDetails: [
        {
          classId: 101,
          className: 'Calculus I',
          attendancePercentage: 90.0,
          averageGrade: 95.0,
        },
      ],
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProgress),
      })
    );

    render(<StudentProgressCard />);

    expect(await screen.findByText('Personalized Progress Card')).toBeInTheDocument();
    expect(screen.getByText('85.5%')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('Student ID #42')).toBeInTheDocument();
    expect(screen.getByText('Calculus I')).toBeInTheDocument();
    expect(screen.getByText('Grade A - Outstanding')).toBeInTheDocument();
    expect(screen.getByText('Good Standing')).toBeInTheDocument();
  });

  it('displays N/A fallback states when attendance and grades are not yet recorded', async () => {
    const mockEmptyProgress = {
      studentId: 7,
      enrolledClassesCount: 1,
      overallAttendancePercentage: 0,
      overallAverageGrade: 0,
      totalAttendanceRecords: 0,
      presentAttendanceRecords: 0,
      totalSubmissionsCount: 0,
      gradedSubmissionsCount: 0,
      classDetails: [],
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockEmptyProgress),
      })
    );

    render(<StudentProgressCard />);

    expect(await screen.findByText('Personalized Progress Card')).toBeInTheDocument();
    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('No Sessions Marked')).toBeInTheDocument();
    expect(screen.getByText('Awaiting Evaluation')).toBeInTheDocument();
  });

  it('renders an error message when the network request fails', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    );

    render(<StudentProgressCard />);

    expect(await screen.findByText(/Failed to load progress data/i)).toBeInTheDocument();
  });

  it('clears session on 401 unauthenticated response', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
      })
    );

    let container;
    await act(async () => {
      const res = render(<StudentProgressCard />);
      container = res.container;
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(container.firstChild).toBeNull();
  });
});
