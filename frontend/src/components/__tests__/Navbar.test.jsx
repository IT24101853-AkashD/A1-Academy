import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('shows the Categories link for an Admin', () => {
    localStorage.setItem('role', 'Admin');
    renderNavbar();
    expect(screen.getByText(/categories/i)).toBeInTheDocument();
  });

  it('does not show the Categories link for a Student', () => {
    localStorage.setItem('role', 'Student');
    renderNavbar();
    expect(screen.queryByText(/categories/i)).not.toBeInTheDocument();
  });

  it('does not show My Profile when logged out', () => {
    renderNavbar();
    expect(screen.queryByText(/my profile/i)).not.toBeInTheDocument();
  });

  it('shows My Profile for any logged-in role once a token is stored', () => {
    localStorage.setItem('role', 'Student');
    localStorage.setItem('token', 'student-token');
    renderNavbar();
    expect(screen.getByText(/my profile/i)).toBeInTheDocument();
  });

  it('shows Login and Register, not Log Out, when logged out', () => {
    renderNavbar();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
  });

  it('shows Log Out, not Login/Register, once a token is stored', () => {
    localStorage.setItem('role', 'Student');
    localStorage.setItem('token', 'student-token');
    renderNavbar();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^login$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /register/i })).not.toBeInTheDocument();
  });

  it('clicking Log Out clears the stored session and navigates home', () => {
    localStorage.setItem('role', 'Admin');
    localStorage.setItem('token', 'admin-token');

    // jsdom doesn't implement real navigation - stub window.location so the "navigate home"
    // half of logout is observable, the same way the rest of the suite treats it.
    delete window.location;
    window.location = { href: '' };

    renderNavbar();
    fireEvent.click(screen.getByRole('button', { name: /log out/i }));

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('role')).toBeNull();
    expect(window.location.href).toBe('/');
  });
});
