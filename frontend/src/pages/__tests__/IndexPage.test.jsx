import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import IndexPage from '../IndexPage';

const renderPage = () => render(
  <MemoryRouter>
    <IndexPage />
  </MemoryRouter>
);

describe('IndexPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the public marketing landing page when logged out', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /the future of/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join as a student/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /teach with us/i })).toBeInTheDocument();
    // Role-specific content never renders for a logged-out visitor.
    expect(screen.queryByText(/about a1 academy/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/facilities at a1 academy/i)).not.toBeInTheDocument();
  });

  it('shows the public marketing landing page for an Admin too (no dedicated Admin home view)', () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');

    renderPage();

    expect(screen.getByRole('heading', { name: /the future of/i })).toBeInTheDocument();
  });

  it('shows courses, About, and Facilities for a logged-in Student', () => {
    localStorage.setItem('role', 'Student');
    localStorage.setItem('token', 'student-token');

    renderPage();

    expect(screen.getByRole('heading', { name: /continue your/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse courses/i })).toHaveAttribute('href', '/student/categories');
    expect(screen.getByText(/other courses/i)).toBeInTheDocument();
    expect(screen.getByText(/about a1 academy/i)).toBeInTheDocument();
    expect(screen.getByText(/facilities at a1 academy/i)).toBeInTheDocument();
    // The public-only CTAs (irrelevant once already registered) don't show here.
    expect(screen.queryByRole('button', { name: /join as a student/i })).not.toBeInTheDocument();
  });

  it('shows only About - no courses or Facilities - for a logged-in Teacher', () => {
    localStorage.setItem('role', 'Teacher');
    localStorage.setItem('token', 'teacher-token');

    renderPage();

    expect(screen.getByRole('heading', { name: /thank you for/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view your profile/i })).toHaveAttribute('href', '/profile');
    expect(screen.getByText(/about a1 academy/i)).toBeInTheDocument();
    expect(screen.queryByText(/other courses/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/facilities at a1 academy/i)).not.toBeInTheDocument();
  });
});
