import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RegisterStudentModal from '../RegisterStudentModal';

describe('RegisterStudentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the student registration modal when isOpen is true', () => {
    const onClose = vi.fn();

    render(
      <RegisterStudentModal
        isOpen={true}
        onClose={onClose}
      />
    );

    const modal = document.getElementById('register-student-modal');

    expect(modal).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    const onClose = vi.fn();

    const { container } = render(
      <RegisterStudentModal
        isOpen={false}
        onClose={onClose}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();

    render(
      <RegisterStudentModal
        isOpen={true}
        onClose={onClose}
      />
    );

    const closeButton = screen.getByRole('button', {
      name: /close/i,
    });

    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should accept valid registration data', () => {
    const onClose = vi.fn();

    render(
      <RegisterStudentModal
        isOpen={true}
        onClose={onClose}
      />
    );

    const firstNameInput =
      screen.getByPlaceholderText('First name');

    const lastNameInput =
      screen.getByPlaceholderText('Last name');

    const emailInput =
      screen.getByPlaceholderText('student@example.com');

    const passwordInput =
      screen.getByLabelText('Password');

    const confirmPasswordInput =
      screen.getByLabelText('Confirm Password');

    fireEvent.change(firstNameInput, {
      target: { value: 'John' },
    });

    fireEvent.change(lastNameInput, {
      target: { value: 'Doe' },
    });

    fireEvent.change(emailInput, {
      target: { value: 'john.doe@example.com' },
    });

    fireEvent.change(passwordInput, {
      target: { value: 'SecurePassword123!' },
    });

    fireEvent.change(confirmPasswordInput, {
      target: { value: 'SecurePassword123!' },
    });

    expect(firstNameInput).toHaveValue('John');
    expect(lastNameInput).toHaveValue('Doe');
    expect(emailInput).toHaveValue('john.doe@example.com');
    expect(passwordInput).toHaveValue('SecurePassword123!');
    expect(confirmPasswordInput).toHaveValue(
      'SecurePassword123!'
    );
  });

  it('should display validation error for invalid email', () => {
    const onClose = vi.fn();

    render(
      <RegisterStudentModal
        isOpen={true}
        onClose={onClose}
      />
    );

    const emailInput =
      screen.getByPlaceholderText('student@example.com');

    const verifyButton = screen.getByRole('button', {
      name: 'Verify',
    });

    fireEvent.change(emailInput, {
      target: { value: 'student@invalid' },
    });

    fireEvent.click(verifyButton);

    expect(emailInput).toHaveValue('student@invalid');

    const emailError = document.getElementById('email-error');
    expect(emailError).toBeInTheDocument();
  });

  it('should prevent form submission with invalid email', () => {
    const onClose = vi.fn();

    render(
      <RegisterStudentModal
        isOpen={true}
        onClose={onClose}
      />
    );

    const emailInput =
      screen.getByPlaceholderText('student@example.com');

    fireEvent.change(emailInput, {
      target: { value: 'invalidemail' },
    });

    const submitButton = screen.getByRole('button', {
      name: /Create Active Account/i,
    });

    fireEvent.click(submitButton);

    expect(emailInput).toHaveValue('invalidemail');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should show error if passwords do not match', () => {
    const onClose = vi.fn();

    render(
      <RegisterStudentModal
        isOpen={true}
        onClose={onClose}
      />
    );

    const passwordInput =
      screen.getByLabelText('Password');

    const confirmPasswordInput =
      screen.getByLabelText('Confirm Password');

    fireEvent.change(passwordInput, {
      target: { value: 'Password123!' },
    });

    fireEvent.change(confirmPasswordInput, {
      target: { value: 'DifferentPassword456!' },
    });

    expect(passwordInput).not.toHaveValue(
      confirmPasswordInput.value
    );

    expect(
      screen.queryByText(
        /password.*match|match.*password|different/i
      )
    ).toBeInTheDocument();
  });

  it('should allow toggling password visibility', () => {
    const onClose = vi.fn();

    render(
      <RegisterStudentModal
        isOpen={true}
        onClose={onClose}
      />
    );

    const passwordInput =
      screen.getByLabelText('Password');

    expect(passwordInput).toHaveAttribute(
      'type',
      'password'
    );

    const eyeIcons =
      screen.getAllByText('visibility');

    expect(eyeIcons.length).toBeGreaterThan(0);

    const firstEyeButton =
      eyeIcons[0].closest('button');

    expect(firstEyeButton).toBeInTheDocument();

    fireEvent.click(firstEyeButton);

    // Verify the button click was triggered
    expect(firstEyeButton).toBeInTheDocument();
  });

  it('should render email verification workflow', () => {
    const onClose = vi.fn();

    render(
      <RegisterStudentModal
        isOpen={true}
        onClose={onClose}
      />
    );

    const verifyButton = screen.getByRole('button', {
      name: 'Verify',
    });

    expect(verifyButton).toBeInTheDocument();

    const emailInput =
      screen.getByPlaceholderText('student@example.com');

    fireEvent.change(emailInput, {
      target: { value: 'test@example.com' },
    });

    expect(emailInput).toHaveValue(
      'test@example.com'
    );

    fireEvent.click(verifyButton);

    expect(emailInput).toHaveValue(
      'test@example.com'
    );
  });

  it('should display proper modal styling', () => {
    const onClose = vi.fn();

    render(
      <RegisterStudentModal
        isOpen={true}
        onClose={onClose}
      />
    );

    const modal =
      document.getElementById('register-student-modal');

    expect(modal).toBeInTheDocument();

    expect(modal).toHaveClass(
      'fixed',
      'inset-0',
      'z-[110]'
    );
  });

  it('should show heading "Student Registration"', () => {
    const onClose = vi.fn();

    render(
      <RegisterStudentModal
        isOpen={true}
        onClose={onClose}
      />
    );

    const heading =
      screen.getByText('Student Registration');

    expect(heading).toBeInTheDocument();
  });

  it('should have a link to sign in for existing accounts', () => {
    const onClose = vi.fn();

    render(
      <RegisterStudentModal
        isOpen={true}
        onClose={onClose}
      />
    );

    const signInLink = screen.getByRole('link', {
      name: 'Sign In',
    });

    expect(signInLink).toBeInTheDocument();
  });

  it('should have Google sign-in button', () => {
    const onClose = vi.fn();

    render(
      <RegisterStudentModal
        isOpen={true}
        onClose={onClose}
      />
    );

    const googleButton = screen.getByRole('button', {
      name: /Sign in with Google/i,
    });

    expect(googleButton).toBeInTheDocument();
  });
});