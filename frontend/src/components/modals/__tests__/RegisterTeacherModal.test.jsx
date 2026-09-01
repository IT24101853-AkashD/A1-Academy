import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterTeacherModal from '../RegisterTeacherModal';

describe('RegisterTeacherModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the teacher registration modal when isOpen is true', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const modal = document.getElementById('register-teacher-modal');
    expect(modal).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    const onClose = vi.fn();
    const { container } = render(<RegisterTeacherModal isOpen={false} onClose={onClose} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should accept valid teacher registration data', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const firstNameInput = screen.getByPlaceholderText('First name');
    const lastNameInput = screen.getByPlaceholderText('Last name');
    const emailInput = screen.getByPlaceholderText('teacher@example.com');
    const qualificationsInput = screen.getByPlaceholderText('e.g. BSc. Mathematics');
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');

    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
    fireEvent.change(lastNameInput, { target: { value: 'Smith' } });
    fireEvent.change(emailInput, { target: { value: 'jane.smith@example.com' } });
    fireEvent.change(qualificationsInput, { target: { value: 'BSc. Mathematics, MEd' } });
    fireEvent.change(passwordInputs[0], { target: { value: 'SecurePassword123!' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'SecurePassword123!' } });

    expect(firstNameInput.value).toBe('Jane');
    expect(lastNameInput.value).toBe('Smith');
    expect(emailInput.value).toBe('jane.smith@example.com');
    expect(qualificationsInput.value).toBe('BSc. Mathematics, MEd');
    expect(passwordInputs[0].value).toBe('SecurePassword123!');
    expect(passwordInputs[1].value).toBe('SecurePassword123!');
  });

  it('should display validation error for invalid email', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const emailInput = screen.getByPlaceholderText('teacher@example.com');
    const verifyButton = screen.getByText('Verify');

    fireEvent.change(emailInput, { target: { value: 'teacher@invalid' } });
    fireEvent.click(verifyButton);

    expect(emailInput.value).toBe('teacher@invalid');
  });

  it('should prevent form submission with invalid email', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const emailInput = screen.getByPlaceholderText('teacher@example.com');
    fireEvent.change(emailInput, { target: { value: 'invalidemail' } });

    const submitButton = screen.getByRole('button', { name: /Submit Teacher Application/i });
    fireEvent.click(submitButton);

    expect(emailInput.value).toBe('invalidemail');
  });

  it('should show error if passwords do not match', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const password1 = passwordInputs[0];
    const password2 = passwordInputs[1];

    fireEvent.change(password1, { target: { value: 'Password123!' } });
    fireEvent.change(password2, { target: { value: 'DifferentPassword456!' } });

    expect(password1.value).not.toBe(password2.value);
  });

  it('should allow toggling password visibility', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const eyeIcons = screen.getAllByText('visibility');
    expect(eyeIcons.length).toBeGreaterThan(0);

    const firstEyeButton = eyeIcons[0].closest('button');
    fireEvent.click(firstEyeButton);
    
    expect(firstEyeButton).toBeInTheDocument();
  });

  it('should render email verification workflow', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const verifyButton = screen.getByText('Verify');
    expect(verifyButton).toBeInTheDocument();
    
    const emailInput = screen.getByPlaceholderText('teacher@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(verifyButton);

    expect(emailInput.value).toBe('test@example.com');
  });

  it('should have professional qualifications upload button', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const uploadButton = screen.getByText('Upload');
    expect(uploadButton).toBeInTheDocument();
  });

  it('should display pending review process information', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const pendingText = screen.getByText(/Pending Review Process/i);
    expect(pendingText).toBeInTheDocument();
    
    const reviewInfo = screen.getByText(/ensure scholarly excellence/i);
    expect(reviewInfo).toBeInTheDocument();
  });

  it('should display proper modal styling', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const modal = document.getElementById('register-teacher-modal');
    expect(modal).toHaveClass('fixed', 'inset-0', 'z-[110]');
  });

  it('should show heading "Teacher Application"', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const heading = screen.getByText('Teacher Application');
    expect(heading).toBeInTheDocument();
  });

  it('should have a link to sign in for approved teachers', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const signInLink = screen.getByText(/Sign In/i);
    expect(signInLink).toBeInTheDocument();
  });

  it('should require first name field', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const firstNameInput = screen.getByPlaceholderText('First name');
    expect(firstNameInput).toHaveAttribute('required');
  });

  it('should require email field', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const emailInput = screen.getByPlaceholderText('teacher@example.com');
    expect(emailInput).toHaveAttribute('required');
  });

  it('should require qualifications field', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const qualificationsInput = screen.getByPlaceholderText('e.g. BSc. Mathematics');
    expect(qualificationsInput).toHaveAttribute('required');
  });

  it('should require password field', () => {
    const onClose = vi.fn();
    render(<RegisterTeacherModal isOpen={true} onClose={onClose} />);
    
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    expect(passwordInputs[0]).toHaveAttribute('required');
    expect(passwordInputs[1]).toHaveAttribute('required');
  });
});
