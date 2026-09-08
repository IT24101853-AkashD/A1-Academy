import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import './AuthModals.css';

// Modal ids that share the two-page "open book" chrome and stay visually continuous as the user
// moves between them (role pick -> form -> OTP -> etc.) rather than closing and reopening.
const BOOK_MODAL_IDS = [
    'register-modal',
    'register-student-modal',
    'register-teacher-modal',
    'login-modal',
    'otp-modal',
    'forgot-password-modal',
    'new-password-modal',
];

// Of those, this subset shares one physical page (a "leaf") that flips between its front
// (whichever registration form is active) and back (login) - the one transition in this flow
// that's naturally a two-sided flip rather than a linear "next step".
const FLIP_MODAL_IDS = ['register-student-modal', 'register-teacher-modal', 'login-modal'];

export default function AuthModals({ activeModal, setActiveModal, openModal, closeModal }) {
    const [showPasswords, setShowPasswords] = useState({});
    const [timers, setTimers] = useState({ 'Student': 0, 'Teacher': 0, 'Reset': 0 });
    const [isVerifying, setIsVerifying] = useState(false);
    const [otpContext, setOtpContext] = useState(null);
    const [otpError, setOtpError] = useState('');
    const [otpValues, setOtpValues] = useState(['', '', '', '', '']);
    const [forgotEmail, setForgotEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [verifiedEmails, setVerifiedEmails] = useState({});
    const [formErrors, setFormErrors] = useState({});
    const [teacherFile, setTeacherFile] = useState(null);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [loginErrors, setLoginErrors] = useState({});
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    // Which registration form the flip leaf's front face shows - set when a role is picked on
    // the role-select page, not derived from activeModal, so the leaf can flip to Login (back)
    // and, if the user backs out to the role picker and re-enters the same role, land on the
    // same face without needing activeModal itself to encode the role.
    const [registerRole, setRegisterRole] = useState('Student');

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setIsLoggingIn(true);
            setLoginErrors({});
            try {
                const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/google-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ credential: tokenResponse.access_token })
                });

                if (res.ok) {
                    const result = await res.json();
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('role', result.role);
                    closeModal();
                    openModal('success-login-modal');
                } else {
                    const errorText = await res.text();
                    if (activeModal === 'login-modal') {
                        setLoginErrors({ 'general': errorText || 'Google Sign-In failed.' });
                    } else {
                        alert(errorText || 'Google Sign-In failed.');
                    }
                }
            } catch (err) {
                if (activeModal === 'login-modal') {
                    setLoginErrors({ 'general': 'Server connection error.' });
                } else {
                    alert('Server connection error.');
                }
            } finally {
                setIsLoggingIn(false);
            }
        },
        onError: () => {
            if (activeModal === 'login-modal') {
                setLoginErrors({ 'general': 'Google Sign-In was cancelled or failed.' });
            } else {
                alert('Google Sign-In was cancelled or failed.');
            }
        }
    });

    const togglePassword = (id) => {
        setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    useEffect(() => {
        let intervals = {};
        ['Student', 'Teacher', 'Reset'].forEach(role => {
            if (timers[role] > 0) {
                intervals[role] = setInterval(() => {
                    setTimers(prev => ({ ...prev, [role]: prev[role] - 1 }));
                }, 1000);
            }
        });
        return () => Object.values(intervals).forEach(clearInterval);
    }, [timers]);

    useEffect(() => {
        if (!activeModal) {
            document.querySelectorAll('form').forEach(form => form.reset());
            setFormErrors({});
            setLoginErrors({});
            setOtpError('');
            setOtpValues(['', '', '', '', '']);
            setVerifiedEmails({});
            setShowPasswords({});
            setForgotEmail('');
            setResetToken('');
            setTeacherFile(null);
            setOtpContext(null);
            setRegisterRole('Student');
        }
    }, [activeModal]);

    const startOtpTimer = (role) => {
        setTimers(prev => ({ ...prev, [role]: 60 }));
    };

    const sendOtp = async (emailId, role) => {
        const firstNameId = role === 'Student' ? 'student-firstname' : 'teacher-firstname';
        const firstName = document.getElementById(firstNameId)?.value;
        const email = document.getElementById(emailId)?.value;

        if (!firstName) {
            setFormErrors({...formErrors, [firstNameId]: 'First name is required before verifying email.'});
            return;
        }

        if (!email) {
            setFormErrors({...formErrors, [emailId]: 'Please enter your email address.'});
            return;
        }
        setIsSendingOtp(true);
        setOtpError('');
        try {
            const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, firstName })
            });
            if (res.ok) {
                setOtpValues(['', '', '', '', '']);
                setOtpContext(role);
                openModal('otp-modal');
                startOtpTimer(role);
            } else {
                const text = await res.text();
                setFormErrors({...formErrors, [emailId]: text});
            }
        } catch (err) {
            setFormErrors({...formErrors, [emailId]: 'Server connection error.'});
        } finally {
            setIsSendingOtp(false);
        }
    };

    const sendForgotOtp = async () => {
        const emailInput = document.getElementById('forgot-email').value;
        const firstNameInput = document.getElementById('forgot-firstname').value;
        if (!emailInput || !firstNameInput) {
            const errorEl = document.getElementById('forgot-error');
            errorEl.innerText = 'Please enter both fields.';
            errorEl.classList.remove('hidden');
            return;
        }
        document.getElementById('forgot-error').classList.add('hidden');
        setForgotEmail(emailInput);
        setIsSendingOtp(true);

        try {
            const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput, firstName: firstNameInput })
            });
            if (res.ok) {
                setOtpValues(['', '', '', '', '']);
                setOtpContext('Reset');
                openModal('otp-modal');
                startOtpTimer('Reset');
            } else {
                const text = await res.text();
                const errorEl = document.getElementById('forgot-error');
                errorEl.innerText = text;
                errorEl.classList.remove('hidden');
            }
        } catch (err) {
            alert('Server error.');
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (/[^0-9]/.test(value)) return;
        const newValues = [...otpValues];
        newValues[index] = value;
        setOtpValues(newValues);
        if (value && index < 4) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus();
        }
    };

    const handleVerifyOtp = async () => {
        const otp = otpValues.join('');
        if (otp.length < 5) {
            setOtpError('Please enter the full 5-digit code.');
            return;
        }
        setOtpError('');
        setIsVerifying(true);

        try {
            let endpoint = import.meta.env.VITE_API_URL + '/api/auth/verify-otp';
            let bodyData = {};

            if (otpContext === 'Reset') {
                endpoint = import.meta.env.VITE_API_URL + '/api/auth/verify-reset-otp';
                bodyData = { email: document.getElementById('forgot-email')?.value, otp };
            } else {
                const emailId = otpContext === 'Student' ? 'student-email' : 'teacher-email';
                bodyData = { email: document.getElementById(emailId)?.value, otp };
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            if (res.ok) {
                if (otpContext === 'Reset') {
                    const data = await res.json();
                    setResetToken(data.token);
                    openModal('new-password-modal');
                } else {
                    const emailId = otpContext === 'Student' ? 'student-email' : 'teacher-email';
                    const emailValue = document.getElementById(emailId)?.value;
                    if (emailValue) {
                        setVerifiedEmails(prev => ({ ...prev, [emailValue]: true }));
                    }
                    setFormErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors[emailId];
                        return newErrors;
                    });
                    openModal(otpContext === 'Student' ? 'register-student-modal' : 'register-teacher-modal');
                }
            } else {
                setOtpError('Invalid or expired OTP. Please check again.');
            }
        } catch (err) {
            setOtpError('Server connection error.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleRegister = async (e, role) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.role = role;

        setFormErrors({});
        let errors = {};

        const emailId = role === 'Student' ? 'student-email' : 'teacher-email';
        const passwordId = role === 'Student' ? 'student-password' : 'teacher-password';
        const firstNameId = role === 'Student' ? 'student-firstname' : 'teacher-firstname';

        const firstNameValue = document.getElementById(firstNameId)?.value || '';
        if (!firstNameValue.trim()) {
            errors[firstNameId] = 'First name is required.';
        }

        const emailValue = document.getElementById(emailId)?.value || '';
        data.email = emailValue;
        formData.set('email', emailValue);
        formData.set('firstName', firstNameValue);
        formData.set('role', role);

        if (!emailValue.trim()) {
            errors[emailId] = 'Email address is required.';
        } else if (!verifiedEmails[data.email]) {
            errors[emailId] = 'Please verify your email first.';
        }

        if (!data.password) {
            errors[passwordId] = 'Password is required.';
        } else if (data.password !== data.confirmPassword) {
            errors[passwordId] = 'Passwords do not match.';
        }

        if (role === 'Teacher') {
            if (!data.qualifications?.trim()) {
                errors['teacher-qualifications'] = 'Professional qualifications are required.';
            }
            if (!teacherFile) {
                errors['teacher-qualifications'] = 'Please upload your professional qualification certificate.';
            }
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/register', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                const result = await res.json();
                e.target.reset();
                setVerifiedEmails({});
                setFormErrors({});
                setTeacherFile(null);
                closeModal();
                if (result.isApproved) {
                    openModal('success-student-modal');
                } else {
                    openModal('pending-teacher-modal');
                }
            } else {
                const text = await res.text();
                setFormErrors({ [emailId]: 'Registration failed: ' + text });
            }
        } catch (err) {
            setFormErrors({ [emailId]: 'Server connection error.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        let errors = {};
        if (!email || !password) {
            errors['general'] = 'Please enter both fields.';
            setLoginErrors(errors);
            return;
        }

        setIsLoggingIn(true);
        setLoginErrors({});

        try {
            const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (res.ok) {
                const result = await res.json();
                localStorage.setItem('token', result.token);
                localStorage.setItem('role', result.role);
                closeModal();
                openModal('success-login-modal');
            } else {
                setLoginErrors({ 'password': 'Invalid Email or Invalid Password' });
            }
        } catch (err) {
            setLoginErrors({ 'general': 'Server connection error.' });
        } finally {
            setIsLoggingIn(false);
        }
    };

    const saveNewPassword = async () => {
        const newPassword = document.getElementById('reset-new-password').value;
        const confirmPassword = document.getElementById('reset-confirm-password').value;
        const errorEl = document.getElementById('reset-password-error');

        if (newPassword !== confirmPassword) {
            errorEl.innerText = 'Passwords do not match.';
            errorEl.classList.remove('hidden');
            return;
        }

        try {
            const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail, newPassword, token: resetToken })
            });
            if (res.ok) {
                if (document.getElementById('forgot-firstname')) document.getElementById('forgot-firstname').value = '';
                if (document.getElementById('forgot-email')) document.getElementById('forgot-email').value = '';
                if (document.getElementById('reset-new-password')) document.getElementById('reset-new-password').value = '';
                if (document.getElementById('reset-confirm-password')) document.getElementById('reset-confirm-password').value = '';
                setOtpValues(['', '', '', '', '']);
                setForgotEmail('');
                setResetToken('');
                openModal('success-reset-modal');
            } else {
                errorEl.innerText = 'Failed to reset password.';
                errorEl.classList.remove('hidden');
            }
        } catch (err) {
            errorEl.innerText = 'Server error.';
            errorEl.classList.remove('hidden');
        }
    };

    const startForgotPasswordFlow = () => {
        setForgotEmail('');
        setResetToken('');
        setIsSubmitting(false);
        const errorEl = document.getElementById('forgot-error');
        if (errorEl) errorEl.classList.add('hidden');
        openModal('forgot-password-modal');
    };

    const pickRole = (role) => {
        setRegisterRole(role);
        openModal(role === 'Student' ? 'register-student-modal' : 'register-teacher-modal');
    };

    // ---------- shared bits ----------

    const PasswordToggle = ({ id }) => (
        <button type="button" onClick={() => togglePassword(id)} className="book-auth-password-toggle">
            <span className="material-symbols-outlined text-[18px]">{showPasswords[id] ? 'visibility_off' : 'visibility'}</span>
        </button>
    );

    const GoogleButton = () => (
        <button type="button" onClick={() => googleLogin()} className="book-auth-button book-auth-button--google">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            Sign in with Google
        </button>
    );

    // ---------- book chrome ----------

    const isBookOpen = BOOK_MODAL_IDS.includes(activeModal);
    const isFlipGroup = FLIP_MODAL_IDS.includes(activeModal);
    const isFlipped = activeModal === 'login-modal';

    const bookCloseHandler = () => {
        if (activeModal === 'otp-modal') {
            if (otpContext === 'Student') openModal('register-student-modal');
            else if (otpContext === 'Teacher') openModal('register-teacher-modal');
            else openModal('forgot-password-modal');
        } else if (activeModal === 'forgot-password-modal' || activeModal === 'new-password-modal') {
            openModal('login-modal');
        } else {
            closeModal();
        }
    };

    // ---------- role picker (register-modal) ----------

    const renderRolePicker = () => (
        <div className="book-auth-single-face">
            <p className="book-auth-eyebrow">New Chapter</p>
            <h2 className="book-auth-heading">Join A1 Academy</h2>
            <p className="book-auth-subtext">Select your role to begin the registration process.</p>
            <div className="book-auth-role-grid">
                <div className="book-auth-role-card" onClick={() => pickRole('Student')}>
                    <div className="book-auth-role-avatar">
                        <img src="https://cdn-icons-png.flaticon.com/512/3135/3135810.png" alt="Cartoon Student Avatar" />
                    </div>
                    <h3 className="book-auth-role-title">Register as a Student</h3>
                    <p className="book-auth-role-text">Browse courses, track your progress, and earn digital badges.</p>
                </div>
                <div className="book-auth-role-card" onClick={() => pickRole('Teacher')}>
                    <div className="book-auth-role-avatar">
                        <img src="https://cdn-icons-png.flaticon.com/512/3429/3429433.png" alt="Cartoon Teacher Avatar" />
                    </div>
                    <h3 className="book-auth-role-title">Register as a Teacher</h3>
                    <p className="book-auth-role-text">Submit your qualifications, manage classes, and guide the next generation.</p>
                </div>
            </div>
        </div>
    );

    // ---------- registration forms (front faces of the flip leaf) ----------

    const renderStudentForm = () => {
        const emailVal = document.getElementById('student-email')?.value || '';
        const isVerified = verifiedEmails[emailVal] && emailVal !== '';
        return (
            <form className="book-auth-face" onSubmit={(e) => handleRegister(e, 'Student')} noValidate>
                <p className="book-auth-eyebrow">New Chapter</p>
                <h2 className="book-auth-heading">Student Registration</h2>
                <p className="book-auth-subtext">Create your Active account today to start browsing courses and earning your digital badges.</p>

                <div className="book-auth-fields">
                    <div className="book-auth-field-row">
                        <label className="book-auth-field">
                            <span>First Name</span>
                            <input
                                type="text" id="student-firstname" name="firstName" placeholder="First name" required
                                disabled={isVerified}
                                onChange={() => { if (formErrors['student-firstname']) setFormErrors({ ...formErrors, 'student-firstname': null }); }}
                            />
                        </label>
                        <label className="book-auth-field">
                            <span>Last Name (Optional)</span>
                            <input type="text" id="student-lastname" name="lastName" placeholder="Last name" />
                        </label>
                    </div>
                    {formErrors['student-firstname'] && <p className="book-auth-error">{formErrors['student-firstname']}</p>}

                    <label className="book-auth-field">
                        <span>Email Address</span>
                    </label>
                    <div className="book-auth-field-with-action">
                        <label className="book-auth-field" style={{ textTransform: 'none', letterSpacing: 'normal' }}>
                            <input
                                type="email" id="student-email" name="email" placeholder="student@example.com" required
                                disabled={isVerified}
                                onChange={() => setFormErrors({ ...formErrors, 'student-email': null })}
                            />
                        </label>
                        {isVerified ? (
                            <div className="book-auth-inline-badge">
                                <span className="material-symbols-outlined text-[16px]">check_circle</span> Verified
                            </div>
                        ) : (
                            <button type="button" disabled={isSendingOtp} onClick={() => sendOtp('student-email', 'Student')} className="book-auth-inline-button">
                                {isSendingOtp ? (
                                    <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Sending</>
                                ) : 'Verify'}
                            </button>
                        )}
                    </div>
                    {formErrors['student-email'] ? (
                        <p className="book-auth-error">{formErrors['student-email']}</p>
                    ) : (
                        <p className="book-auth-hint">Must be a unique email address.</p>
                    )}

                    <div className="book-auth-field-row">
                        <label className="book-auth-field">
                            <span>Password</span>
                            <div className="book-auth-password-field">
                                <input type={showPasswords['student-password'] ? 'text' : 'password'} id="student-password" name="password" placeholder="••••••••" required />
                                <PasswordToggle id="student-password" />
                            </div>
                        </label>
                        <label className="book-auth-field">
                            <span>Confirm</span>
                            <div className="book-auth-password-field">
                                <input
                                    type={showPasswords['student-confirm-password'] ? 'text' : 'password'} id="student-confirm-password" name="confirmPassword" placeholder="••••••••" required
                                    onChange={() => setFormErrors({ ...formErrors, 'student-password': null })}
                                />
                                <PasswordToggle id="student-confirm-password" />
                            </div>
                        </label>
                    </div>
                    {formErrors['student-password'] && <p className="book-auth-error">{formErrors['student-password']}</p>}
                </div>

                <button type="submit" disabled={isSubmitting} className="book-auth-button">
                    {isSubmitting ? (
                        <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Registering...</>
                    ) : 'Create Active Account'}
                </button>

                <div className="book-auth-divider-row">
                    <span className="book-auth-divider-line" />
                    <span>Or continue with</span>
                    <span className="book-auth-divider-line" />
                </div>
                <GoogleButton />

                <p className="book-auth-switch">
                    Already have an account?{' '}
                    <button type="button" className="book-auth-link" onClick={() => openModal('login-modal')}>Sign In</button>
                </p>
            </form>
        );
    };

    const renderTeacherForm = () => {
        const emailVal = document.getElementById('teacher-email')?.value || '';
        const isVerified = verifiedEmails[emailVal] && emailVal !== '';
        return (
            <form className="book-auth-face" onSubmit={(e) => handleRegister(e, 'Teacher')} noValidate>
                <p className="book-auth-eyebrow">New Chapter</p>
                <h2 className="book-auth-heading">Teacher Application</h2>
                <p className="book-auth-subtext">Join our community of expert educators. Provide your details and credentials below.</p>

                <div className="book-auth-callout">
                    <p className="book-auth-callout-title">
                        <span className="material-symbols-outlined text-[16px]">info</span> Pending Review Process
                    </p>
                    <p className="book-auth-callout-text">
                        All new teacher accounts are placed in a Pending status. Scheduling tools unlock once an Administrator verifies your qualifications.
                    </p>
                </div>

                <div className="book-auth-fields" style={{ marginTop: 16 }}>
                    <div className="book-auth-field-row">
                        <label className="book-auth-field">
                            <span>First Name</span>
                            <input
                                type="text" id="teacher-firstname" name="firstName" placeholder="First name" required
                                disabled={isVerified}
                                onChange={() => { if (formErrors['teacher-firstname']) setFormErrors({ ...formErrors, 'teacher-firstname': null }); }}
                            />
                        </label>
                        <label className="book-auth-field">
                            <span>Last Name (Optional)</span>
                            <input type="text" id="teacher-lastname" name="lastName" placeholder="Last name" />
                        </label>
                    </div>
                    {formErrors['teacher-firstname'] && <p className="book-auth-error">{formErrors['teacher-firstname']}</p>}

                    <div className="book-auth-field-with-action">
                        <label className="book-auth-field" style={{ textTransform: 'none', letterSpacing: 'normal' }}>
                            <span style={{ textTransform: 'uppercase', letterSpacing: '1.6px', fontSize: 11 }}>Email Address</span>
                            <input
                                type="email" id="teacher-email" name="email" placeholder="teacher@example.com" required
                                disabled={isVerified}
                                onChange={() => setFormErrors({ ...formErrors, 'teacher-email': null })}
                            />
                        </label>
                        {isVerified ? (
                            <div className="book-auth-inline-badge">
                                <span className="material-symbols-outlined text-[16px]">check_circle</span> Verified
                            </div>
                        ) : (
                            <button type="button" disabled={isSendingOtp} onClick={() => sendOtp('teacher-email', 'Teacher')} className="book-auth-inline-button">
                                {isSendingOtp ? (
                                    <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Sending</>
                                ) : 'Verify'}
                            </button>
                        )}
                    </div>
                    {formErrors['teacher-email'] && <p className="book-auth-error">{formErrors['teacher-email']}</p>}
                    <p className="book-auth-hint">Must be a unique email address.</p>

                    <div className="book-auth-field-with-action">
                        <label className="book-auth-field" style={{ textTransform: 'none', letterSpacing: 'normal' }}>
                            <span style={{ textTransform: 'uppercase', letterSpacing: '1.6px', fontSize: 11 }}>Professional Qualifications</span>
                            <input
                                type="text" id="teacher-qualifications" name="qualifications" placeholder="e.g. BSc. Mathematics" required
                                onChange={() => { if (formErrors['teacher-qualifications']) setFormErrors({ ...formErrors, 'teacher-qualifications': null }); }}
                            />
                        </label>
                        <input type="file" id="teacher-qual-file" name="QualificationDocument" className="hidden" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                setIsUploadingFile(true);
                                if (formErrors['teacher-qualifications']) setFormErrors({ ...formErrors, 'teacher-qualifications': null });
                                setTimeout(() => {
                                    setTeacherFile(e.target.files[0].name);
                                    setIsUploadingFile(false);
                                }, 1500);
                            } else {
                                setTeacherFile(null);
                            }
                        }} />
                        <button type="button" onClick={() => document.getElementById('teacher-qual-file').click()} disabled={isUploadingFile || !!teacherFile} className="book-auth-inline-button">
                            {isUploadingFile ? (
                                <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Uploading</>
                            ) : teacherFile ? (
                                <><span className="material-symbols-outlined text-[16px]">check_circle</span> Uploaded</>
                            ) : (
                                <><span className="material-symbols-outlined text-[16px]">upload_file</span> Upload</>
                            )}
                        </button>
                    </div>
                    {formErrors['teacher-qualifications'] && <p className="book-auth-error">{formErrors['teacher-qualifications']}</p>}
                    <p className="book-auth-hint">Required for administrative verification. Please upload certificates.</p>

                    <div className="book-auth-field-row">
                        <label className="book-auth-field">
                            <span>Password</span>
                            <div className="book-auth-password-field">
                                <input type={showPasswords['teacher-password'] ? 'text' : 'password'} id="teacher-password" name="password" placeholder="••••••••" required />
                                <PasswordToggle id="teacher-password" />
                            </div>
                        </label>
                        <label className="book-auth-field">
                            <span>Confirm</span>
                            <div className="book-auth-password-field">
                                <input
                                    type={showPasswords['teacher-confirm-password'] ? 'text' : 'password'} id="teacher-confirm-password" name="confirmPassword" placeholder="••••••••" required
                                    onChange={() => { if (formErrors['teacher-password']) setFormErrors({ ...formErrors, 'teacher-password': null }); }}
                                />
                                <PasswordToggle id="teacher-confirm-password" />
                            </div>
                        </label>
                    </div>
                    {formErrors['teacher-password'] && <p className="book-auth-error">{formErrors['teacher-password']}</p>}
                </div>

                <button type="submit" disabled={isSubmitting} className="book-auth-button">
                    {isSubmitting ? (
                        <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Submitting...</>
                    ) : 'Submit Teacher Application'}
                </button>

                <p className="book-auth-switch">
                    Already an approved teacher?{' '}
                    <button type="button" className="book-auth-link" onClick={() => openModal('login-modal')}>Sign In</button>
                </p>
            </form>
        );
    };

    const renderLoginForm = () => (
        <form className="book-auth-face book-auth-face--back" onSubmit={handleLogin} noValidate>
            <p className="book-auth-eyebrow">Welcome Back</p>
            <h2 className="book-auth-heading">Sign In to Continue</h2>
            <p className="book-auth-subtext">Pick up right where your last chapter ended.</p>

            <div className="book-auth-fields">
                <label className="book-auth-field">
                    <span>Email Address</span>
                    <input type="email" id="login-email" name="email" placeholder="you@example.com" required />
                </label>

                <label className="book-auth-field">
                    <span>Password</span>
                    <div className="book-auth-password-field">
                        <input type={showPasswords['login-password'] ? 'text' : 'password'} id="login-password" name="password" placeholder="••••••••" required />
                        <PasswordToggle id="login-password" />
                    </div>
                </label>
                {loginErrors['password'] && <p className="book-auth-error">{loginErrors['password']}</p>}

                <p className="book-auth-forgot">
                    <button type="button" onClick={() => startForgotPasswordFlow()}>Forgot password?</button>
                </p>
            </div>

            {loginErrors['general'] && <p className="book-auth-error" style={{ marginTop: 8 }}>{loginErrors['general']}</p>}

            <button type="submit" disabled={isLoggingIn} className="book-auth-button">
                {isLoggingIn ? 'Logging In...' : 'Sign In'}
            </button>

            <div className="book-auth-divider-row">
                <span className="book-auth-divider-line" />
                <span>Or continue with</span>
                <span className="book-auth-divider-line" />
            </div>
            <GoogleButton />

            <p className="book-auth-switch">
                New to A1 Academy?{' '}
                <button type="button" className="book-auth-link" onClick={() => openModal('register-modal')}>Create an Account</button>
            </p>
        </form>
    );

    // ---------- OTP / forgot-password / new-password pages ----------

    const renderOtpPage = () => (
        <div className="book-auth-single-face" style={{ textAlign: 'center' }}>
            <div className="book-auth-icon-badge">
                <span className="material-symbols-outlined text-[28px]">mark_email_read</span>
            </div>
            <h2 className="book-auth-heading">Check your email</h2>
            <p className="book-auth-subtext">We sent a 5-digit {otpContext === 'Reset' ? 'reset' : 'verification'} code to your email.</p>

            <div className="book-auth-otp-row">
                {[0, 1, 2, 3, 4].map((index) => (
                    <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        maxLength={1}
                        className="book-auth-otp-box"
                        value={otpValues[index]}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    />
                ))}
            </div>
            {otpError && <p className="book-auth-error" style={{ marginBottom: 12 }}>{otpError}</p>}

            <button disabled={isVerifying} onClick={handleVerifyOtp} className="book-auth-button">
                {isVerifying ? (
                    <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Verifying...</>
                ) : 'Verify Code'}
            </button>

            <p className="book-auth-switch">
                Didn't receive it?{' '}
                {timers[otpContext] > 0 ? (
                    <strong style={{ color: 'var(--book-ink)' }}>Resend in {timers[otpContext]}s</strong>
                ) : (
                    <button type="button" className="book-auth-link" onClick={() => {
                        if (otpContext === 'Reset') sendForgotOtp();
                        else sendOtp(otpContext === 'Student' ? 'student-email' : 'teacher-email', otpContext);
                    }}>Resend Code</button>
                )}
            </p>
        </div>
    );

    const renderForgotPasswordPage = () => (
        <div className="book-auth-single-face" style={{ textAlign: 'center' }}>
            <div className="book-auth-icon-badge">
                <span className="material-symbols-outlined text-[28px]">lock_reset</span>
            </div>
            <h2 className="book-auth-heading">Reset Password</h2>
            <p className="book-auth-subtext">Enter the email address associated with your account, and we'll send you a code to reset your password.</p>

            <div className="book-auth-fields" style={{ textAlign: 'left' }}>
                <label className="book-auth-field">
                    <span>First Name</span>
                    <input type="text" id="forgot-firstname" placeholder="e.g. Nilavan" required onChange={() => document.getElementById('forgot-error').classList.add('hidden')} />
                </label>
                <label className="book-auth-field">
                    <span>Email Address</span>
                    <input type="email" id="forgot-email" placeholder="e.g. hello@example.com" required onChange={() => document.getElementById('forgot-error').classList.add('hidden')} />
                </label>
                <p id="forgot-error" className="text-sm font-bold text-red-500 hidden"></p>
            </div>

            <button onClick={sendForgotOtp} disabled={isSendingOtp} className="book-auth-button">
                {isSendingOtp ? (
                    <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Sending...</>
                ) : 'Send Reset Code'}
            </button>
        </div>
    );

    const renderNewPasswordPage = () => (
        <div className="book-auth-single-face" style={{ textAlign: 'center' }}>
            <div className="book-auth-icon-badge">
                <span className="material-symbols-outlined text-[28px]">key</span>
            </div>
            <h2 className="book-auth-heading">Create New Password</h2>
            <p className="book-auth-subtext">Your identity has been verified. Please set a new password for your account.</p>

            <div className="book-auth-fields" style={{ textAlign: 'left' }}>
                <label className="book-auth-field">
                    <span>New Password</span>
                    <div className="book-auth-password-field">
                        <input
                            type={showPasswords['reset-new-password'] ? 'text' : 'password'} id="reset-new-password" placeholder="Enter new password" required
                            onChange={() => document.getElementById('reset-password-error').classList.add('hidden')}
                        />
                        <PasswordToggle id="reset-new-password" />
                    </div>
                </label>
                <label className="book-auth-field">
                    <span>Confirm Password</span>
                    <div className="book-auth-password-field">
                        <input
                            type={showPasswords['reset-confirm-password'] ? 'text' : 'password'} id="reset-confirm-password" placeholder="Confirm new password" required
                            onChange={() => document.getElementById('reset-password-error').classList.add('hidden')}
                        />
                        <PasswordToggle id="reset-confirm-password" />
                    </div>
                </label>
                <p id="reset-password-error" className="text-sm font-bold text-red-500 hidden">Passwords do not match.</p>
            </div>

            <button onClick={saveNewPassword} className="book-auth-button">Save New Password</button>
        </div>
    );

    // ---------- book right-page: every sub-page stays mounted at all times ----------
    //
    // Several handlers (handleVerifyOtp's Reset branch, sendForgotOtp, the resend-code link)
    // read straight from a DIFFERENT page's inputs via document.getElementById - e.g. verifying
    // an OTP reads the email back out of whichever registration form (or the forgot-password
    // page) is "behind" the OTP page, not from React state. That only works if that other page's
    // inputs are still in the DOM, just hidden - conditionally rendering (mounting only the
    // active page) would unmount them and silently break those reads. So every page below is
    // always present; only `display` toggles which one is visible, exactly mirroring how the
    // original modal-per-screen version never unmounted anything either.
    const showIf = (condition) => ({ display: condition ? 'contents' : 'none' });

    return (
        <>
            {/* THE BOOK - registration (role pick -> form), OTP, forgot/reset password, login */}
            <div className={`book-modal-overlay ${isBookOpen ? 'is-open' : 'is-closed'}`}>
                <div className="book-auth-book">
                    <div className="book-auth-page-stack book-auth-page-stack--left" />
                    <div className="book-auth-page-stack book-auth-page-stack--right" />
                    <button onClick={bookCloseHandler} className="book-auth-close" aria-label="Close">
                        <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
                    <div className="book-auth-cover">
                        <div className="book-auth-pages">
                            <div className="book-auth-left-page">
                                <div className="book-auth-margin-line" />
                                <svg width="52" height="52" viewBox="0 0 48 48" fill="none" style={{ marginTop: '6%' }}>
                                    <path d="M24 13C20 10 12 8 5 9V35C12 34 20 36 24 39" style={{ stroke: 'var(--book-accent)' }} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M24 13C28 10 36 8 43 9V35C36 34 28 36 24 39" style={{ stroke: 'var(--book-accent)' }} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M24 13V39" style={{ stroke: 'var(--book-accent)' }} strokeWidth="1.3" strokeLinecap="round" />
                                </svg>
                                <h1 className="book-auth-title">A1 Academy</h1>
                                <div className="book-auth-divider">
                                    <span className="book-auth-divider-line" />
                                    <span className="book-auth-divider-diamond" />
                                    <span className="book-auth-divider-line" />
                                </div>
                                <p className="book-auth-tagline">Every great story of learning starts on a fresh page. Turn yours today.</p>
                                <p className="book-auth-footnote">Your Story</p>
                            </div>

                            <div className="book-auth-spine">
                                <span className="book-auth-spine-label">A1 ACADEMY</span>
                            </div>

                            <div className="book-auth-right-page">
                                <div className="book-auth-ribbon" />

                                <div style={showIf(activeModal === 'register-modal')}>{renderRolePicker()}</div>

                                <div style={showIf(isFlipGroup)}>
                                    <div className="book-auth-flip-wrap">
                                        <div className={`book-auth-leaf${isFlipped ? ' is-flipped' : ''}`}>
                                            <div style={showIf(registerRole !== 'Teacher')}>{renderStudentForm()}</div>
                                            <div style={showIf(registerRole === 'Teacher')}>{renderTeacherForm()}</div>
                                            {renderLoginForm()}
                                        </div>
                                    </div>
                                </div>

                                <div style={showIf(activeModal === 'otp-modal')}>{renderOtpPage()}</div>
                                <div style={showIf(activeModal === 'forgot-password-modal')}>{renderForgotPasswordPage()}</div>
                                <div style={showIf(activeModal === 'new-password-modal')}>{renderNewPasswordPage()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* STUDENT SUCCESS */}
            <div className={`book-modal-overlay book-single-modal ${activeModal === 'success-student-modal' ? 'is-open' : 'is-closed'}`}>
                <div className="book-auth-book">
                    <div className="book-single-page">
                        <div className="book-auth-icon-badge" style={{ width: 88, height: 88, background: 'rgba(52, 168, 83, 0.15)' }}>
                            <span className="text-[40px]">🎉</span>
                        </div>
                        <h2 className="book-auth-heading">Congratulations!</h2>
                        <p className="book-auth-subtext">You are now a member of A1 Academy! Start browsing courses and earning your digital badges today.</p>
                        <button onClick={() => openModal('login-modal')} className="book-auth-button">Continue to Login</button>
                    </div>
                </div>
            </div>

            {/* TEACHER PENDING */}
            <div className={`book-modal-overlay book-single-modal ${activeModal === 'pending-teacher-modal' ? 'is-open' : 'is-closed'}`}>
                <div className="book-auth-book">
                    <div className="book-single-page">
                        <div className="book-auth-icon-badge" style={{ width: 88, height: 88 }}>
                            <span className="material-symbols-outlined text-[40px]">hourglass_top</span>
                        </div>
                        <h2 className="book-auth-heading">Application Submitted!</h2>
                        <p className="book-auth-subtext">Your credentials have been sent to our Administrators for verification. Once approved, you will receive an email notification and can log in to access your dashboard.</p>
                        <button onClick={closeModal} className="book-auth-button">Got it!</button>
                    </div>
                </div>
            </div>

            {/* PASSWORD RESET SUCCESS */}
            <div className={`book-modal-overlay book-single-modal ${activeModal === 'success-reset-modal' ? 'is-open' : 'is-closed'}`}>
                <div className="book-auth-book">
                    <div className="book-single-page">
                        <div className="book-auth-icon-badge" style={{ width: 88, height: 88, background: 'rgba(52, 168, 83, 0.15)' }}>
                            <span className="material-symbols-outlined text-[40px]" style={{ color: '#2f855a' }}>check_circle</span>
                        </div>
                        <h2 className="book-auth-heading">Password Reset!</h2>
                        <p className="book-auth-subtext">Your password has been successfully updated. You can now log in with your new credentials.</p>
                        <button onClick={() => openModal('login-modal')} className="book-auth-button">Return to Login</button>
                    </div>
                </div>
            </div>

            {/* LOGIN SUCCESS (kept as a little celebratory moment) */}
            <div className={`book-modal-overlay book-single-modal ${activeModal === 'success-login-modal' ? 'is-open' : 'is-closed'}`}>
                <div className="book-auth-book">
                    <div className="book-single-page">
                        <div className="book-auth-icon-badge" style={{ width: 96, height: 96, background: 'rgba(201, 162, 39, 0.18)' }}>
                            <span className="material-symbols-outlined text-[44px]" style={{ color: 'var(--book-accent, #c9a227)' }}>favorite</span>
                        </div>
                        <h2 className="book-auth-heading" style={{ fontSize: 30 }}>Welcome</h2>
                        <p className="book-auth-subtext">You have successfully logged in to A1 Academy!</p>
                        <button onClick={() => window.location.href = '/'} className="book-auth-button">Back to Home</button>
                    </div>
                </div>
            </div>
        </>
    );
}
