import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

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
    const [loginRole, setLoginRole] = useState('student');
    const [verifiedEmails, setVerifiedEmails] = useState({});
    const [formErrors, setFormErrors] = useState({});
    const [teacherFile, setTeacherFile] = useState(null);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [loginErrors, setLoginErrors] = useState({});
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setIsLoggingIn(true);
            setLoginErrors({});
            try {
                const res = await fetch('http://localhost:5123/api/auth/google-login', {
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

        if (!email) return alert('Please enter your email.');
        setIsSendingOtp(true);
        setOtpError('');
        try {
            const res = await fetch('http://localhost:5123/api/auth/send-otp', {
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
            const res = await fetch('http://localhost:5123/api/auth/forgot-password', {
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

    const handleOtpKeyUp = (e, index) => {
        const inputs = document.querySelectorAll('#otp-modal input[type="text"]');
        if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
            inputs[index - 1].focus();
        } else if (e.target.value.length === 1 && index < 4) {
            inputs[index + 1].focus();
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
            let endpoint = 'http://localhost:5123/api/auth/verify-otp';
            let bodyData = {};
            
            if (otpContext === 'Reset') {
                endpoint = 'http://localhost:5123/api/auth/verify-reset-otp';
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

        // Validation
        const emailId = role === 'Student' ? 'student-email' : 'teacher-email';
        const passwordId = role === 'Student' ? 'student-password' : 'teacher-password';
        const firstNameId = role === 'Student' ? 'student-firstname' : 'teacher-firstname';
        
        // Disabled inputs are omitted from FormData, so we must grab the value manually
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
            const res = await fetch('http://localhost:5123/api/auth/register', {
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
            const res = await fetch('http://localhost:5123/api/auth/login', {
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
            const res = await fetch('http://localhost:5123/api/auth/reset-password', {
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
        if(errorEl) errorEl.classList.add('hidden');
        openModal('forgot-password-modal');
    };

    return (
        <>
{/* REGISTER MODAL POPUP */}
<div id="register-modal" className={`fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300 ${activeModal === 'register-modal' ? '' : 'hidden'}`}>
    <div className="relative w-full max-w-4xl bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 md:p-12 overflow-hidden border border-surface-variant">
        <button onClick={closeModal} className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>
        <div className="text-center mb-10">
            <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg font-bold text-primary mb-4">Join A1 Academy</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Select your role to begin the registration process.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div onClick={() => openModal('register-student-modal')} className="bg-surface-container-lowest rounded-[16px] p-8 shadow-level-1 hover:shadow-level-2 transition-all duration-300 border-2 border-transparent hover:border-primary-fixed group flex flex-col items-center text-center cursor-pointer">
                <div className="w-28 h-28 mb-6 rounded-full overflow-hidden bg-primary-fixed/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <img src="https://cdn-icons-png.flaticon.com/512/3135/3135810.png" alt="Cartoon Student Avatar" className="w-20 h-20 object-contain drop-shadow-md"/>
                </div>
                <h3 className="font-headline-sm text-[24px] text-primary mb-3">Register as a Student</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Browse courses, track your progress, and earn digital badges.</p>
            </div>
            <div onClick={() => openModal('register-teacher-modal')} className="bg-surface-container-lowest rounded-[16px] p-8 shadow-level-1 hover:shadow-level-2 transition-all duration-300 border-2 border-transparent hover:border-primary-fixed group flex flex-col items-center text-center cursor-pointer">
                <div className="w-28 h-28 mb-6 rounded-full overflow-hidden bg-secondary-fixed/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <img src="https://cdn-icons-png.flaticon.com/512/3429/3429433.png" alt="Cartoon Teacher Avatar" className="w-20 h-20 object-contain drop-shadow-md"/>
                </div>
                <h3 className="font-headline-sm text-[24px] text-primary mb-3">Register as a Teacher</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Submit your qualifications, manage classes, and guide the next generation.</p>
            </div>
        </div>
    </div>
</div>

{/* STUDENT REGISTRATION FORM MODAL */}
<div id="register-student-modal" className={`fixed inset-0 z-[110] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300 ${activeModal === 'register-student-modal' ? '' : 'hidden'}`}>
    <div className="relative w-full max-w-5xl min-h-[700px] flex flex-col justify-center bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 md:p-12 border border-surface-variant overflow-hidden">
        <button onClick={() => openModal('register-modal')} className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="flex flex-col items-center text-center md:border-r border-surface-variant md:pr-8">
                <div className="w-32 h-32 mb-6 rounded-full overflow-hidden bg-primary-fixed/40 flex items-center justify-center">
                    <img src="https://cdn-icons-png.flaticon.com/512/3135/3135810.png" alt="Cartoon Student Avatar" className="w-24 h-24 object-contain drop-shadow-md hover:scale-110 transition-transform duration-300"/>
                </div>
                <h2 className="font-headline-md text-headline-md text-primary mb-3">Student Registration</h2>
                <p className="text-body-md text-on-surface-variant max-w-xs mb-4">Create your Active account today to start browsing courses and earning your digital badges.</p>
            </div>
            <div>
                <form className="space-y-4" onSubmit={(e) => handleRegister(e, 'Student')} noValidate>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-label-md text-on-surface mb-1" htmlFor="student-firstname">First Name</label>
                            {(() => {
                                const emailVal = document.getElementById('student-email')?.value || '';
                                const isVerified = verifiedEmails[emailVal] && emailVal !== '';
                                return (
                                    <input className={`w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all ${isVerified ? 'opacity-70 bg-surface-variant' : ''}`} type="text" id="student-firstname" name="firstName" placeholder="First name" required disabled={isVerified} onChange={() => { if (formErrors['student-firstname']) setFormErrors({...formErrors, 'student-firstname': null}); }} />
                                );
                            })()}
                            {formErrors['student-firstname'] && <p className="text-error text-label-sm mt-1 font-medium">{formErrors['student-firstname']}</p>}
                        </div>
                        <div>
                            <label className="block font-label-md text-on-surface mb-1" htmlFor="student-lastname">Last Name <span className="text-outline font-normal">(Optional)</span></label>
                            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="student-lastname" name="lastName" placeholder="Last name" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block font-label-md text-on-surface mb-1" htmlFor="student-email">Email Address</label>
                        
                        {(() => {
                            const emailVal = document.getElementById('student-email')?.value || '';
                            const isVerified = verifiedEmails[emailVal] && emailVal !== '';
                            return (
                                <>
                                <div className="flex gap-2">
                                    <input className={`w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all ${isVerified ? 'opacity-70 bg-surface-variant' : ''}`} type="email" id="student-email" name="email" placeholder="student@example.com" required onChange={() => setFormErrors({...formErrors, 'student-email': null})} disabled={isVerified} />
                                    {isVerified ? (
                                        <div className="shrink-0 bg-green-50 text-green-700 border border-green-200 font-label-md px-4 py-2.5 rounded-lg w-[116px] flex items-center justify-center gap-1">
                                            <span className="material-symbols-outlined text-[18px]">check_circle</span> Verified
                                        </div>
                                    ) : (
                                        <button type="button" id="student-verify-btn" disabled={isSendingOtp} onClick={() => sendOtp('student-email', 'Student')} className="shrink-0 bg-secondary-container text-on-secondary-container font-label-md px-4 py-2.5 rounded-lg hover:bg-secondary-fixed transition-all shadow-sm cursor-pointer w-[116px] flex items-center justify-center gap-1 disabled:opacity-70 ">
                                            {isSendingOtp ? (
                                                <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Sending...</>
                                            ) : (
                                                'Verify'
                                            )}
                                        </button>
                                    )}
                                </div>
                                {formErrors['student-email'] ? (
                                    <p className="text-xs text-error font-bold mt-1">{formErrors['student-email']}</p>
                                ) : (
                                    <p className="text-xs text-on-surface-variant mt-1">* Must be a unique email address.</p>
                                )}
                                </>
                            );
                        })()}
                    </div>
                    
                    <div>
                        <label className="block font-label-md text-on-surface mb-1" htmlFor="student-password">Password</label>
                        <div className="relative">
                            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-12" type={showPasswords['student-password'] ? "text" : "password"} id="student-password" name="password" placeholder="••••••••" required />
                            <button type="button" onClick={() => togglePassword('student-password')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer outline-none">
                                <span className="material-symbols-outlined text-[20px]">{showPasswords['student-password'] ? "visibility_off" : "visibility"}</span>
                            </button>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-1">* Will be securely hashed.</p>
                    </div>
                    
                    <div>
                        <label className="block font-label-md text-on-surface mb-1" htmlFor="student-confirm-password">Confirm Password</label>
                        <div className="relative">
                            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-12" type={showPasswords['student-confirm-password'] ? "text" : "password"} id="student-confirm-password" name="confirmPassword" placeholder="••••••••" required onChange={() => setFormErrors({...formErrors, 'student-password': null})} />
                            <button type="button" onClick={() => togglePassword('student-confirm-password')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer outline-none">
                                <span className="material-symbols-outlined text-[20px]">{showPasswords['student-confirm-password'] ? "visibility_off" : "visibility"}</span>
                            </button>
                        </div>
                        {formErrors['student-password'] && <p className="text-xs text-error font-bold mt-1">{formErrors['student-password']}</p>}
                    </div>
                    
                    <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer mt-6 flex items-center justify-center gap-2 disabled:opacity-70 ">
                        {isSubmitting ? (
                            <><span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> Registering...</>
                        ) : (
                            'Create Active Account'
                        )}
                    </button>
                    
                    <div className="flex items-center gap-4 my-6">
                        <div className="h-px bg-surface-variant flex-1"></div>
                        <span className="text-label-sm text-on-surface-variant">Or continue with</span>
                        <div className="h-px bg-surface-variant flex-1"></div>
                    </div>
                    
                    <button type="button" onClick={() => googleLogin()} className="w-full bg-surface border border-outline-variant text-on-surface font-label-md py-3 rounded-full hover:bg-surface-container-low transition-all shadow-sm cursor-pointer flex items-center justify-center gap-3">
                        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/google/google-original.svg" alt="Google Logo" className="w-5 h-5"/>
                        Sign in with Google
                    </button>
                    
                    <p className="text-center text-body-sm text-on-surface-variant mt-6">
                        Already have an account? <button type="button" onClick={() => openModal('login-modal')} className="font-bold text-primary hover:underline cursor-pointer outline-none">Sign In</button>
                    </p>
                </form>
            </div>
        </div>
    </div>
</div>

{/* DYNAMIC OTP MODAL POPUP */}
<div id="otp-modal" className={`fixed inset-0 z-[120] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300 ${activeModal === 'otp-modal' ? '' : 'hidden'}`}>
    <div className="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <button onClick={() => {
            if (otpContext === 'Student') openModal('register-student-modal');
            else if (otpContext === 'Teacher') openModal('register-teacher-modal');
            else openModal('forgot-password-modal');
        }} className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary-fixed/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-primary">mark_email_read</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-primary mb-2">Check your email</h2>
        <p className="text-body-md text-on-surface-variant mb-6">
            We sent a 5-digit {otpContext === 'Reset' ? 'reset' : 'verification'} code to your email.
        </p>
        
        <div className="flex justify-center gap-3 mb-2">
            {[0, 1, 2, 3, 4].map((index) => (
                <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    className="w-12 h-14 md:w-14 md:h-16 text-center text-headline-sm font-headline-sm bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-on-surface"
                    value={otpValues[index]}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                />
            ))}
        </div>
        {otpError && <p className="text-error text-xs font-bold mb-4">{otpError}</p>}
        {!otpError && <div className="mb-4"></div>}

        <button disabled={isVerifying} onClick={handleVerifyOtp} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer flex justify-center items-center gap-2 disabled:opacity-70  disabled:active:scale-100">
            {isVerifying ? (
                <><span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> Verifying...</>
            ) : (
                'Verify Code'
            )}
        </button>

        <div className="text-center mt-6">
            <p className="text-body-sm text-on-surface-variant">Didn't receive it? 
                {timers[otpContext] > 0 ? (
                    <span className="font-bold text-on-surface ml-1">Resend in {timers[otpContext]}s</span>
                ) : (
                    <a href="#" onClick={(e) => { 
                        e.preventDefault(); 
                        if (otpContext === 'Reset') sendForgotOtp();
                        else sendOtp(otpContext === 'Student' ? 'student-email' : 'teacher-email', otpContext);
                    }} className="text-primary font-bold hover:underline ml-1">Resend Code</a>
                )}
            </p>
        </div>
    </div>
</div>

{/*  3. NO-SCROLL TEACHER REGISTRATION FORM MODAL POPUP  */}
<div id="register-teacher-modal" className={`fixed inset-0 z-[110] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300 ${activeModal === 'register-teacher-modal' ? '' : 'hidden'}`}>
    <div className="relative w-full max-w-5xl min-h-[700px] flex flex-col justify-center bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 md:p-12 border border-surface-variant overflow-hidden">
        
        {/*  Close Button  */}
        <button onClick={() => openModal('register-modal')} className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>

        {/*  Two-Column Grid Layout  */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            
            {/*  Left Column: Branding & Intro  */}
            <div className="flex flex-col items-center text-center md:border-r border-surface-variant md:pr-8">
                <div className="w-32 h-32 mb-6 rounded-full overflow-hidden bg-secondary-fixed/40 flex items-center justify-center">
                    <img src="https://cdn-icons-png.flaticon.com/512/3429/3429433.png" alt="Cartoon Teacher Avatar" className="w-24 h-24 object-contain drop-shadow-md hover:scale-110 transition-transform duration-300"/>
                </div>
                <h2 className="font-headline-md text-headline-md text-primary mb-3">Teacher Application</h2>
                <p className="text-body-md text-on-surface-variant max-w-xs mb-4">Join our community of expert educators. Provide your details and credentials below.</p>
                <div className="bg-surface-container-low p-4 rounded-lg border border-surface-dim">
                    <p className="text-label-md font-label-md text-primary flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">info</span>
                        Pending Review Process
                    </p>
                    <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">To ensure scholarly excellence, all new teacher accounts are placed in a <strong>Pending status</strong>. Scheduling tools will unlock once an Administrator verifies your qualifications.</p>
                </div>
            </div>

            {/*  Right Column: The Form  */}
            <div>
                <form className="space-y-4" onSubmit={(e) => handleRegister(e, 'Teacher')} noValidate>
                    
                    {/*  Side-by-Side Names Grid  */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/*  First Name  */}
                        <div>
                            <label className="block font-label-md text-on-surface mb-1" htmlFor="teacher-firstname">First Name</label>
                            {(() => {
                                const emailVal = document.getElementById('teacher-email')?.value || '';
                                const isVerified = verifiedEmails[emailVal] && emailVal !== '';
                                return (
                                    <input className={`w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all ${isVerified ? 'opacity-70 bg-surface-variant' : ''}`} type="text" id="teacher-firstname" name="firstName" placeholder="First name" required disabled={isVerified} onChange={() => { if (formErrors['teacher-firstname']) setFormErrors({...formErrors, 'teacher-firstname': null}); }} />
                                );
                            })()}
                            {formErrors['teacher-firstname'] && <p className="text-error text-label-sm mt-1 font-medium">{formErrors['teacher-firstname']}</p>}
                        </div>

                        {/*  Last Name (Optional)  */}
                        <div>
                            <label className="block font-label-md text-on-surface mb-1" htmlFor="teacher-lastname">Last Name <span className="text-outline font-normal">(Optional)</span></label>
                            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="teacher-lastname" name="lastName" placeholder="Last name" />
                        </div>
                    </div>

                    {/*  Email with Verify Button  */}
                    <div>
                        <label className="block font-label-md text-on-surface mb-1" htmlFor="teacher-email">Email Address</label>
                        
                        {(() => {
                            const emailVal = document.getElementById('teacher-email')?.value || '';
                            const isVerified = verifiedEmails[emailVal] && emailVal !== '';
                            return (
                                <>
                                <div className="flex gap-2">
                                    <input className={`w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all ${isVerified ? 'opacity-70 bg-surface-variant' : ''}`} type="email" id="teacher-email" name="email" placeholder="teacher@example.com" required onChange={() => setFormErrors({...formErrors, 'teacher-email': null})} disabled={isVerified} />
                                    {isVerified ? (
                                        <div className="shrink-0 bg-green-50 text-green-700 border border-green-200 font-label-md px-4 py-2.5 rounded-lg w-[116px] flex items-center justify-center gap-1">
                                            <span className="material-symbols-outlined text-[18px]">check_circle</span> Verified
                                        </div>
                                    ) : (
                                        <button type="button" id="teacher-verify-btn" disabled={isSendingOtp} onClick={() => sendOtp('teacher-email', 'Teacher')} className="shrink-0 bg-secondary-container text-on-secondary-container font-label-md px-4 py-2.5 rounded-lg hover:bg-secondary-fixed transition-all shadow-sm cursor-pointer w-[116px] flex items-center justify-center gap-1 disabled:opacity-70 ">
                                            {isSendingOtp ? (
                                                <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Sending...</>
                                            ) : (
                                                'Verify'
                                            )}
                                        </button>
                                    )}
                                </div>
                                {formErrors['teacher-email'] && <p className="text-xs text-error font-bold mt-1">{formErrors['teacher-email']}</p>}
                                </>
                            );
                        })()}
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-outline">* Must be a unique email address.</p>
                            {/*  Hidden Verified Text  */}
                            <p id="teacher-verified-text" className="text-xs text-green-600 font-bold hidden flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span> Verified!
                            </p>
                        </div>
                        <p id="teacher-email-error" className="text-xs text-error font-bold hidden mt-1">Please enter a valid email address.</p>
                    </div>

                    {/*  Professional Qualifications with Yellow Upload Button  */}
                    <div>
                        <label className="block font-label-md text-on-surface mb-1" htmlFor="teacher-qualifications">Professional Qualifications</label>
                        <div className="flex gap-2">
                            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="teacher-qualifications" name="qualifications" placeholder="e.g. BSc. Mathematics" required onChange={() => { if (formErrors['teacher-qualifications']) setFormErrors({...formErrors, 'teacher-qualifications': null}); }} />
                            {/*  Dynamic Upload Button  */}
                            <input type="file" id="teacher-qual-file" name="QualificationDocument" className="hidden" onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    setIsUploadingFile(true);
                                    if (formErrors['teacher-qualifications']) setFormErrors({...formErrors, 'teacher-qualifications': null});
                                    setTimeout(() => {
                                        setTeacherFile(e.target.files[0].name);
                                        setIsUploadingFile(false);
                                    }, 1500);
                                } else {
                                    setTeacherFile(null);
                                }
                            }} />
                            <button type="button" id="teacher-upload-btn" onClick={() => document.getElementById('teacher-qual-file').click()} disabled={isUploadingFile || !!teacherFile} className="shrink-0 bg-secondary-container text-on-secondary-container font-label-md px-4 py-2.5 rounded-lg hover:bg-secondary-fixed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm w-auto min-w-[116px] max-w-[200px] disabled:opacity-70 ">
                                {isUploadingFile ? (
                                    <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> <span className="truncate">Uploading...</span></>
                                ) : teacherFile ? (
                                    <><span className="material-symbols-outlined text-[18px]" id="teacher-upload-icon">check_circle</span> <span id="teacher-upload-text" className="truncate">Uploaded</span></>
                                ) : (
                                    <><span className="material-symbols-outlined text-[18px]" id="teacher-upload-icon">upload_file</span> <span id="teacher-upload-text" className="truncate">Upload</span></>
                                )}
                            </button>
                        </div>
                        {formErrors['teacher-qualifications'] && <p className="text-xs text-error font-bold mt-1">{formErrors['teacher-qualifications']}</p>}
                        <p className="text-xs text-outline mt-1">* Required for administrative verification. Please upload certificates.</p>
                    </div>

                    {/*  Password with Toggle (Stacked)  */}
                    <div>
                        <label className="block font-label-md text-on-surface mb-1" htmlFor="teacher-password">Password</label>
                        <div className="relative">
                            <input className="w-full bg-surface border border-outline-variant rounded-lg pl-4 pr-10 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type={showPasswords['teacher-password'] ? 'text' : 'password'} id="teacher-password" name="password" placeholder="••••••••" required />
                            <button type="button" onClick={() => togglePassword('teacher-password')} className="absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-primary transition-colors outline-none cursor-pointer">
                                <span id="teacher-eye-icon-1" className="material-symbols-outlined text-[18px]">{showPasswords['teacher-password'] ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                        <p className="text-xs text-outline mt-1">* Will be securely hashed.</p>
                    </div>

                    {/*  Confirm Password with Toggle (Stacked)  */}
                    <div>
                        <label className="block font-label-md text-on-surface mb-1" htmlFor="teacher-confirm-password">Confirm Password</label>
                        <div className="relative">
                            <input className="w-full bg-surface border border-outline-variant rounded-lg pl-4 pr-10 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type={showPasswords['teacher-confirm-password'] ? 'text' : 'password'} id="teacher-confirm-password" name="confirmPassword" placeholder="••••••••" required onChange={() => { if (formErrors['teacher-password']) setFormErrors({...formErrors, 'teacher-password': null}); }} />
                            <button type="button" onClick={() => togglePassword('teacher-confirm-password')} className="absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-primary transition-colors outline-none cursor-pointer">
                                <span id="teacher-eye-icon-2" className="material-symbols-outlined text-[18px]">{showPasswords['teacher-confirm-password'] ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                        {formErrors['teacher-password'] && <p className="text-xs text-error font-bold mt-1">{formErrors['teacher-password']}</p>}
                    </div>

                    {/*  Submit Button  */}
                    <button disabled={isSubmitting} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm mt-4 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70" type="submit">
                        {isSubmitting ? (
                            <><span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> Submitting...</>
                        ) : (
                            'Submit Teacher Application'
                        )}
                    </button>
                </form>

                <div className="text-center mt-4">
                    <p className="text-body-sm text-on-surface-variant">Already an approved teacher? <a href="#" onClick={(e) => { e.preventDefault(); openModal('login-modal'); }} className="text-primary font-bold hover:underline">Sign In</a></p>
                </div>
            </div>

        </div>
    </div>
</div>

{/*  STUDENT OTP MODAL POPUP  */}
<div id="otp-student-modal" className={`fixed inset-0 z-[130] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300 ${activeModal === 'otp-student-modal' ? '' : 'hidden'}`}>
    <div className="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        {/*  Close Button (Returns to Registration)  */}
        <button onClick={() => openModal('register-student-modal')} className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none">
            <span className="material-symbols-outlined text-[28px]">close</span>
        </button>

        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-fixed/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-primary">mark_email_read</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-primary mb-2">Check your email</h2>
        <p className="text-body-md text-on-surface-variant mb-6">We sent a 5-digit verification code to your email address.</p>
        
        <div className="flex justify-center gap-3 mb-4">
            {[0, 1, 2, 3, 4].map(index => (
                <input key={index} type="text" maxLength={1} onKeyUp={(e) => handleOtpKeyUp(e, index, 'Student')} className="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            ))}
        </div>
        <p id="otp-student-error" className="text-sm text-error font-bold hidden mb-4">Error text here</p>

        <button id="otp-student-verify-btn" disabled={isVerifying} onClick={() => verifyOtp('email', 'Student')} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer flex justify-center items-center gap-2 disabled:opacity-70  disabled:active:scale-100">
            {isVerifying ? (
                <><span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> Verifying...</>
            ) : (
                'Verify Code'
            )}
        </button>
        <div className="mt-6 text-center">
            <p id="otp-student-resend-text" className="text-body-sm text-on-surface-variant">Didn't receive it? Resend in <span id="otp-student-timer" className="font-bold">60</span>s</p>
            <a href="#" id="otp-student-resend-link" onClick={(e) => { e.preventDefault(); sendOtp('email', 'Student'); }} className="hidden text-body-sm text-primary font-bold hover:underline">Resend Code</a>
        </div>
    </div>
</div>

{/*  TEACHER OTP MODAL POPUP  */}
<div id="otp-teacher-modal" className={`fixed inset-0 z-[130] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300 ${activeModal === 'otp-teacher-modal' ? '' : 'hidden'}`}>
    <div className="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        {/*  Close Button (Returns to Registration)  */}
        <button onClick={() => openModal('register-teacher-modal')} className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none">
            <span className="material-symbols-outlined text-[28px]">close</span>
        </button>

        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary-fixed/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-primary">mark_email_read</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-primary mb-2">Check your email</h2>
        <p className="text-body-md text-on-surface-variant mb-6">We sent a 5-digit verification code to your email address.</p>
        
        <div className="flex justify-center gap-3 mb-4">
            {[0, 1, 2, 3, 4].map(index => (
                <input key={index} type="text" maxLength={1} onKeyUp={(e) => handleOtpKeyUp(e, index, 'Teacher')} className="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            ))}
        </div>
        <p id="otp-teacher-error" className="text-sm text-error font-bold hidden mb-4">Error text here</p>

        <button id="otp-teacher-verify-btn" disabled={isVerifying} onClick={() => verifyOtp('teacher-email', 'Teacher')} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer flex justify-center items-center gap-2 disabled:opacity-70  disabled:active:scale-100">
            {isVerifying ? (
                <><span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> Verifying...</>
            ) : (
                'Verify Code'
            )}
        </button>
        <div className="mt-6 text-center">
            <p id="otp-teacher-resend-text" className="text-body-sm text-on-surface-variant">Didn't receive it? Resend in <span id="otp-teacher-timer" className="font-bold">60</span>s</p>
            <a href="#" id="otp-teacher-resend-link" onClick={(e) => { e.preventDefault(); sendOtp('teacher-email', 'Teacher'); }} className="hidden text-body-sm text-primary font-bold hover:underline">Resend Code</a>
        </div>
    </div>
</div>

{/*  3. LOGIN MODAL POPUP  */}
<div id="login-modal" className={`fixed inset-0 z-[120] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300 ${activeModal === 'login-modal' ? '' : 'hidden'}`}>
    <div className="relative w-full max-w-4xl bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 md:p-12 border border-surface-variant overflow-hidden">
        
        {/*  Close Button  */}
        <button onClick={closeModal} className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>

        {/*  Centered Header exactly like Register Modal  */}
        <div className="text-center mb-10">
            <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg font-bold text-primary mb-4">Welcome Back!</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Enter your email and password to log in.</p>
        </div>

        {/*  Two-Column Grid Layout  */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            
            {/*  Left Column: Branding Cartoons  */}
            <div className="flex flex-col items-center justify-center text-center md:border-r border-surface-variant md:pr-8 gap-8">
                <div className="flex flex-row gap-8 justify-center">
                    {/* Student Image Box */}
                    <div className="flex flex-col items-center group cursor-pointer">
                        <div className="w-28 h-28 mb-3 rounded-full overflow-hidden bg-primary-fixed/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135810.png" alt="Student Avatar" className="w-20 h-20 object-contain drop-shadow-md"/>
                        </div>
                        <h3 className="font-label-md text-primary font-bold">Students</h3>
                    </div>
                    {/* Teacher Image Box */}
                    <div className="flex flex-col items-center group cursor-pointer">
                        <div className="w-28 h-28 mb-3 rounded-full overflow-hidden bg-secondary-fixed/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                            <img src="https://cdn-icons-png.flaticon.com/512/3429/3429433.png" alt="Teacher Avatar" className="w-20 h-20 object-contain drop-shadow-md"/>
                        </div>
                        <h3 className="font-label-md text-primary font-bold">Teachers</h3>
                    </div>
                </div>
                <p className="text-body-md text-on-surface-variant max-w-[280px]">
                    Access your unified A1 Academy account. Simply enter your credentials to continue your educational journey.
                </p>
            </div>

            {/*  Right Column: The Login Form  */}
            <div>
                <form onSubmit={handleLogin} className="space-y-4" noValidate>
                    
                    {/*  Email  */}
                    <div>
                        <label className="block font-label-md text-on-surface mb-1" htmlFor="login-email">Email Address</label>
                        <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="email" id="login-email" name="email" placeholder="Enter your email" required />
                    </div>

                    {/*  Password with Toggle & Forgot Link  */}
                    <div>
                        <label className="block font-label-md text-on-surface mb-1" htmlFor="login-password">Password</label>
                        <div className="relative">
                            <input className="w-full bg-surface border border-outline-variant rounded-lg pl-4 pr-10 py-3 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type={showPasswords['login-password'] ? 'text' : 'password'} id="login-password" name="password" placeholder="••••••••" required />
                            <button type="button" onClick={() => togglePassword('login-password')} className="absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-primary transition-colors outline-none cursor-pointer">
                                <span id="login-eye-icon" className="material-symbols-outlined text-[18px]">{showPasswords['login-password'] ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                        {/*  Forgot Password Link & Error Msg  */}
                        <div className="flex justify-between items-center mt-2">
                            <div className="flex-1">
                                {loginErrors['password'] && (
                                    <p className="text-body-sm font-bold text-error">
                                        {loginErrors['password']}
                                    </p>
                                )}
                            </div>
                            <a href="#" onClick={(e) => { e.preventDefault(); startForgotPasswordFlow(); }} className="text-sm font-label-md text-primary hover:underline">Forgot password?</a>
                        </div>
                    </div>

                    {/*  General Error Message  */}
                    {loginErrors['general'] && (
                        <p className="text-[14px] font-bold text-error mt-1 mb-4 text-left">
                            {loginErrors['general']}
                        </p>
                    )}

                    {/*  Submit Button  */}
                    <button disabled={isLoggingIn} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container disabled:opacity-70 active:scale-95 transition-all shadow-sm mt-2 cursor-pointer" type="submit">
                        {isLoggingIn ? 'Logging In...' : 'Log In'}
                    </button>
                    
                    {/*  Google Sign In Divider  */}
                    <div className="relative mt-6 mb-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-surface-variant"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-surface-container-lowest text-outline text-xs">Or continue with</span>
                        </div>
                    </div>

                    {/*  Google Sign In Button  */}
                    <button type="button" onClick={() => googleLogin()} className="w-full flex items-center justify-center gap-3 bg-white border border-outline-variant rounded-full px-4 py-3 text-body-md font-label-md text-on-surface hover:bg-surface-container-low transition-all shadow-sm cursor-pointer">
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                        Sign in with Google
                    </button>
                </form>

                {/*  Registration Link  */}
                <div className="text-center mt-8">
                    <p className="text-body-sm text-on-surface-variant">Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); openModal('register-modal'); }} className="text-primary font-bold hover:underline">Register here</a></p>
                </div>
            </div>

        </div>
    </div>
</div>

{/*  STUDENT SUCCESS MODAL POPUP  */}
<div id="success-student-modal" className={`fixed inset-0 z-[140] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300 ${activeModal === 'success-student-modal' ? '' : 'hidden'}`}>
    <div className="relative w-full max-w-sm bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center animate-bounce shadow-sm">
            <span className="text-[48px]">🎉</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-primary mb-2">Congratulations!</h2>
        <p className="text-body-md text-on-surface-variant mb-8">You are now a member of A1 Academy! Start browsing courses and earning your digital badges today.</p>
        
        <button onClick={() => openModal('login-modal')} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer">Continue to Login</button>
    </div>
</div>

{/*  TEACHER PENDING MODAL POPUP  */}
<div id="pending-teacher-modal" className={`fixed inset-0 z-[140] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300 ${activeModal === 'pending-teacher-modal' ? '' : 'hidden'}`}>
    <div className="relative w-full max-w-sm bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-secondary-container flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[48px] text-on-secondary-container animate-pulse">hourglass_top</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-primary mb-2">Application Submitted!</h2>
        <p className="text-body-md text-on-surface-variant mb-8">Your credentials have been sent to our Administrators for verification. Once approved, you will receive an email notification and can log in to access your dashboard.</p>
        
        <button onClick={closeModal} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer">Got it!</button>
    </div>
</div>

{/*  FORGOT PASSWORD: STEP 1 (EMAIL REQUEST)  */}
<div id="forgot-password-modal" className={`fixed inset-0 z-[130] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300 ${activeModal === 'forgot-password-modal' ? '' : 'hidden'}`}>
    <div className="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <button onClick={() => openModal('login-modal')} className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-fixed/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-primary">lock_reset</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-primary mb-2">Reset Password</h2>
        <p className="text-body-md text-on-surface-variant mb-6">Enter the email address associated with your account, and we'll send you a code to reset your password.</p>
        <div className="text-left mb-4">
            <label className="block font-label-md text-on-surface mb-1" htmlFor="forgot-firstname">First Name</label>
            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="forgot-firstname" placeholder="e.g. Nilavan" required onChange={() => document.getElementById('forgot-error').classList.add('hidden')} />
        </div>
        <div className="text-left mb-6">
            <label className="block font-label-md text-on-surface mb-1" htmlFor="forgot-email">Email Address</label>
            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="email" id="forgot-email" placeholder="e.g. hello@example.com" required onChange={() => document.getElementById('forgot-error').classList.add('hidden')} />
            <p id="forgot-error" className="text-sm text-error font-bold hidden mt-2"></p>
        </div>
        <button onClick={sendForgotOtp} disabled={isSendingOtp} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70  disabled:active:scale-100">
            {isSendingOtp ? (
                <><span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> Sending...</>
            ) : (
                'Send Reset Code'
            )}
        </button>
    </div>
</div>

{/*  FORGOT PASSWORD: STEP 3 (NEW PASSWORD)  */}
<div id="new-password-modal" className={`fixed inset-0 z-[150] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300 ${activeModal === 'new-password-modal' ? '' : 'hidden'}`}>
    <div className="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <button onClick={() => openModal('login-modal')} className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-fixed/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-primary">key</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-primary mb-2">Create New Password</h2>
        <p className="text-body-md text-on-surface-variant mb-6">Your identity has been verified. Please set a new password for your account.</p>
        
        <div className="text-left mb-4">
            <label className="block font-label-md text-on-surface mb-1" htmlFor="reset-new-password">New Password</label>
            <div className="relative">
                <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-12" type={showPasswords['reset-new-password'] ? "text" : "password"} id="reset-new-password" placeholder="Enter new password" required onChange={() => document.getElementById('reset-password-error').classList.add('hidden')} />
                <button type="button" onClick={() => togglePassword('reset-new-password')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer outline-none">
                    <span className="material-symbols-outlined text-[20px]">{showPasswords['reset-new-password'] ? "visibility_off" : "visibility"}</span>
                </button>
            </div>
        </div>
        <div className="text-left mb-6">
            <label className="block font-label-md text-on-surface mb-1" htmlFor="reset-confirm-password">Confirm Password</label>
            <div className="relative">
                <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-12" type={showPasswords['reset-confirm-password'] ? "text" : "password"} id="reset-confirm-password" placeholder="Confirm new password" required onChange={() => document.getElementById('reset-password-error').classList.add('hidden')} />
                <button type="button" onClick={() => togglePassword('reset-confirm-password')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer outline-none">
                    <span className="material-symbols-outlined text-[20px]">{showPasswords['reset-confirm-password'] ? "visibility_off" : "visibility"}</span>
                </button>
            </div>
            <p id="reset-password-error" className="text-xs text-error font-bold hidden mt-1">Passwords do not match.</p>
        </div>

        <button onClick={saveNewPassword} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer">Save New Password</button>
    </div>
</div>

{/*  FORGOT PASSWORD: STEP 4 (SUCCESS ANIMATION)  */}
<div id="success-reset-modal" className={`fixed inset-0 z-[160] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300 ${activeModal === 'success-reset-modal' ? '' : 'hidden'}`}>
    <div className="relative w-full max-w-sm bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[48px] text-green-600">check_circle</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-primary mb-2">Password Reset!</h2>
        <p className="text-body-md text-on-surface-variant mb-8">Your password has been successfully updated. You can now log in with your new credentials.</p>
        
        <button onClick={() => openModal('login-modal')} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer">Return to Login</button>
    </div>
</div>

{/*  SUCCESS LOGIN MODAL (EASTER EGG)  */}
<div id="success-login-modal" className={`fixed inset-0 z-[160] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300 ${activeModal === 'success-login-modal' ? '' : 'hidden'}`}>
    <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-[24px] shadow-level-3 p-12 border border-surface-variant text-center overflow-hidden">
        {/* Fun decorative background elements */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-20 right-10 w-20 h-20 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10">
            <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-tr from-pink-400 to-purple-500 flex items-center justify-center shadow-lg animate-bounce">
                <span className="material-symbols-outlined text-[64px] text-white">favorite</span>
            </div>
            <h2 className="font-display-lg text-[48px] font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-red-500 to-purple-500 mb-4 tracking-tight drop-shadow-sm">
                I LOVE YOU
            </h2>
            <p className="text-body-lg text-on-surface-variant mb-10 font-medium">
                You have successfully logged in to A1 Academy!
            </p>
            
            <button onClick={() => window.location.href = '/'} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-label-lg py-4 rounded-full hover:shadow-lg active:scale-95 transition-all shadow-sm cursor-pointer font-bold text-lg">
                Back to Home
            </button>
        </div>
    </div>
</div>
        </>
    );
}
