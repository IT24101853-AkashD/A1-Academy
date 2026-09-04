import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../Navbar';

const renderNavbar = () => render(
  <MemoryRouter>
    <Navbar />
  </MemoryRouter>
);

describe('Navbar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not show the User Directory link when logged out', () => {
    renderNavbar();
    expect(screen.queryByText(/user directory/i)).not.toBeInTheDocument();
  });

  it('does not show the User Directory link for a Student', () => {
    localStorage.setItem('role', 'Student');
    renderNavbar();
    expect(screen.queryByText(/user directory/i)).not.toBeInTheDocument();
  });

  it('does not show the User Directory link for a Teacher', () => {
    localStorage.setItem('role', 'Teacher');
    renderNavbar();
    expect(screen.queryByText(/user directory/i)).not.toBeInTheDocument();
  });

  it('shows the User Directory link for an Admin', () => {
    localStorage.setItem('role', 'Admin');
    renderNavbar();
    expect(screen.getByText(/user directory/i)).toBeInTheDocument();
  });
});
