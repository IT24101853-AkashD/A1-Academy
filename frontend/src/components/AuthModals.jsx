import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

export default function AuthModals({ activeModal, setActiveModal, openModal, closeModal }) {
    const [showPasswords, setShowPasswords] = useState({});
    const [timers, setTimers] = useState({ 'Student': 0, 'Teacher': 0, 'Reset': 0, 'AdminControls': 0, 'AdminControlsNewEmail': 0 });
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
    // Which registration form the flip leaf's front face shows - normally set when a role is
    // picked on the role-select page (see pickRole), not derived from activeModal, so the leaf
    // can flip to Login (back) and, if the user backs out to the role picker and re-enters the
    // same role, land on the same face without needing activeModal itself to encode the role.
    const [registerRole, setRegisterRole] = useState('Student');
    // The Teacher application's subject checklist, and the error text shown if it fails to load.
    const [categories, setCategories] = useState([]);
    const [categoriesError, setCategoriesError] = useState('');
    // Whether the "Other" row's free-text input is showing - it's its own checkbox alongside the
    // real Categories rather than always-visible, so the common case (every subject already
    // exists) stays a plain checklist.
    const [showOtherSubject, setShowOtherSubject] = useState(false);

    // A caller can also open a specific registration modal directly (IndexPage's "Join as a
    // Student" / "Teach with Us" buttons do exactly that via window.openReactModal, bypassing
    // pickRole entirely) - so registerRole has to stay in sync with activeModal whenever
    // activeModal itself names a role, not only through pickRole's own assignment. Login-modal
    // deliberately doesn't match either branch, which is what lets the flip-to-login-and-back
    // behavior above keep working.
    useEffect(() => {
        if (activeModal === 'register-student-modal') setRegisterRole('Student');
        else if (activeModal === 'register-teacher-modal') setRegisterRole('Teacher');
    }, [activeModal]);

    // Reloaded every time the Teacher form comes into view (not just once on mount) so a
    // Category an Administrator added earlier in the same session - after this page first
    // loaded - still shows up as a choice.
    useEffect(() => {
        if (activeModal !== 'register-teacher-modal') return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(import.meta.env.VITE_API_URL + '/api/categories/public');
                if (!res.ok) throw new Error('Failed to load subjects.');
                const data = await res.json();
                if (!cancelled) {
                    setCategories(data);
                    setCategoriesError('');
                }
            } catch (err) {
                if (!cancelled) setCategoriesError('Could not load the subject list. Please close and reopen this form to try again.');
            }
        })();
        // A fresh open of the form starts with "Other" collapsed - otherwise a leftover value
        // from a previous attempt (e.g. one rejected for a duplicate email) would silently ride
        // along on the next submission.
        setShowOtherSubject(false);
        return () => { cancelled = true; };
    }, [activeModal]);

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
                    window.dispatchEvent(new Event('auth-change'));
                closeModal();
                if (result.role === 'Admin') {
                    window.location.href = '/admin';
                } else {
                    openModal('success-login-modal');
                }
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
        }
    }, [activeModal]);

    const startOtpTimer = (role) => {
        setTimers(prev => ({ ...prev, [role]: 60 }));
    };

    const sendOtp = async (emailId, role) => {
        const firstNameId = role === 'Student' ? 'student-firstname' : 'teacher-firstname';
        const firstName = role.startsWith('AdminControls') ? 'Admin' : document.getElementById(firstNameId)?.value;
        const email = document.getElementById(emailId)?.value;

        if (!firstName && !role.startsWith('AdminControls')) {
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
            const bodyPayload = { email, firstName };
            if (role.startsWith('AdminControls')) {
                bodyPayload.skipEmailCheck = true;
            }
            const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
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
            let endpoint = import.meta.env.VITE_API_URL + '/api/auth/verify-otp';
            let bodyData = {};
            
            if (otpContext === 'Reset') {
                endpoint = import.meta.env.VITE_API_URL + '/api/auth/verify-reset-otp';
                bodyData = { email: document.getElementById('forgot-email')?.value, otp };
            } else if (otpContext === 'AdminControls') {
                bodyData = { email: document.getElementById('admin-current-email')?.value, otp };
            } else if (otpContext === 'AdminControlsNewEmail') {
                bodyData = { email: document.getElementById('admin-new-email')?.value, otp };
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
                } else if (otpContext.startsWith('AdminControls')) {
                    const emailId = otpContext === 'AdminControls' ? 'admin-current-email' : 'admin-new-email';
                    const emailValue = document.getElementById(emailId)?.value;
                    if (emailValue) setVerifiedEmails(prev => ({ ...prev, [emailValue]: true }));
                    setFormErrors(prev => { const newE = {...prev}; delete newE[emailId]; return newE; });
                    openModal('admin-controls-modal');
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
                    window.dispatchEvent(new Event('auth-change'));
                closeModal();
                if (result.role === 'Admin') {
                    window.location.href = '/admin';
                } else {
                    openModal('success-login-modal');
                }
            } else {
                try {
                    const errorText = await res.text();
                    if (errorText) {
                        let msg = errorText;
                        try { 
                            const parsed = JSON.parse(errorText);
                            msg = parsed.message || errorText;
                        } catch(e) {}
                        
                        // If the API returns ProblemDetails, it has a "detail" field
                        try {
                            const parsed = JSON.parse(errorText);
                            if (parsed.detail) msg = parsed.detail;
                        } catch (e) {}

                        setLoginErrors({ 'password': msg });
                    } else {
                        setLoginErrors({ 'password': 'Invalid Email or Invalid Password' });
                    }
                } catch(e) {
                    setLoginErrors({ 'password': 'Invalid Email or Invalid Password' });
                }
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
        if(errorEl) errorEl.classList.add('hidden');
        openModal('forgot-password-modal');
    };

    return (
        <>
{/* REGISTER MODAL POPUP */}
<div id="register-modal" className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${activeModal === 'register-modal' ? 'opacity-100 backdrop-blur-md bg-slate-900/40' : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'}`}>
    <div className={`relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-[24px] shadow-level-3 p-8 md:p-12 overflow-hidden border border-slate-100 dark:border-slate-700 transition-all duration-300 transform ${activeModal === 'register-modal' ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        <button onClick={closeModal} className="absolute top-6 right-6 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>
        <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Join A1 Academy</h2>
            <p className=" text-lg font-medium text-slate-500 dark:text-slate-400">Select your role to begin the registration process.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div onClick={() => openModal('register-student-modal')} className="bg-white dark:bg-slate-800 rounded-[16px] p-8 shadow-level-1 hover:shadow-level-2 transition-all duration-300 border-2 border-transparent hover:border-amber-500 group flex flex-col items-center text-center cursor-pointer">
                <div className="w-28 h-28 mb-6 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <img src="https://cdn-icons-png.flaticon.com/512/3135/3135810.png" alt="Cartoon Student Avatar" className="w-20 h-20 object-contain drop-shadow-md"/>
                </div>
                <h3 className="font-headline-sm text-[24px] text-slate-900 dark:text-white mb-3">Register as a Student</h3>
                <p className=" text-base font-medium text-slate-500 dark:text-slate-400">Browse courses, track your progress, and earn digital badges.</p>
            </div>
            <div onClick={() => openModal('register-teacher-modal')} className="bg-white dark:bg-slate-800 rounded-[16px] p-8 shadow-level-1 hover:shadow-level-2 transition-all duration-300 border-2 border-transparent hover:border-amber-500 group flex flex-col items-center text-center cursor-pointer">
                <div className="w-28 h-28 mb-6 rounded-full overflow-hidden bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <img src="https://cdn-icons-png.flaticon.com/512/3429/3429433.png" alt="Cartoon Teacher Avatar" className="w-20 h-20 object-contain drop-shadow-md"/>
                </div>
                <h3 className="font-headline-sm text-[24px] text-slate-900 dark:text-white mb-3">Register as a Teacher</h3>
                <p className=" text-base font-medium text-slate-500 dark:text-slate-400">Submit your qualifications, manage classes, and guide the next generation.</p>
            </div>
        </div>
    </div>
</div>

{/* STUDENT REGISTRATION FORM MODAL */}
<div id="register-student-modal" className={`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-all duration-300 ${activeModal === 'register-student-modal' ? 'opacity-100 backdrop-blur-md bg-slate-900/40' : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'}`}>
    <div className={`relative w-full max-w-5xl min-h-[700px] flex flex-col justify-center bg-white dark:bg-slate-800 rounded-[24px] shadow-level-3 p-8 md:p-12 border border-slate-100 dark:border-slate-700 overflow-hidden transition-all duration-300 transform ${activeModal === 'register-student-modal' ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        <button onClick={closeModal} className="absolute top-6 right-6 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="flex flex-col items-center text-center md:border-r border-slate-100 dark:border-slate-700 md:pr-8">
                <div className="w-32 h-32 mb-6 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <img src="https://cdn-icons-png.flaticon.com/512/3135/3135810.png" alt="Cartoon Student Avatar" className="w-24 h-24 object-contain drop-shadow-md hover:scale-110 transition-transform duration-300"/>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Student Registration</h2>
                <p className="text-base font-medium text-slate-500 dark:text-slate-400 max-w-xs mb-4">Create your Active account today to start browsing courses and earning your digital badges.</p>
            </div>
            <div>
                <form className="space-y-4" onSubmit={(e) => handleRegister(e, 'Student')} noValidate>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="student-firstname">First Name</label>
                            {(() => {
                                const emailVal = document.getElementById('student-email')?.value || '';
                                const isVerified = verifiedEmails[emailVal] && emailVal !== '';
                                return (
                                    <input className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all ${isVerified ? 'opacity-70 bg-slate-100 dark:bg-slate-700' : ''}`} type="text" id="student-firstname" name="firstName" placeholder="First name" required disabled={isVerified} onChange={() => { if (formErrors['student-firstname']) setFormErrors({...formErrors, 'student-firstname': null}); }} />
                                );
                            })()}
                            {formErrors['student-firstname'] && <p className="text-sm font-bold text-red-500 dark:text-red-400 mt-1">{formErrors['student-firstname']}</p>}
                        </div>
                        <div>
                            <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="student-lastname">Last Name <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span></label>
                            <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type="text" id="student-lastname" name="lastName" placeholder="Last name" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="student-email">Email Address</label>
                        
                        {(() => {
                            const emailVal = document.getElementById('student-email')?.value || '';
                            const isVerified = verifiedEmails[emailVal] && emailVal !== '';
                            return (
                                <>
                                <div className="flex gap-2">
                                    <input className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all ${isVerified ? 'opacity-70 bg-slate-100 dark:bg-slate-700' : ''}`} type="email" id="student-email" name="email" placeholder="student@example.com" required onChange={() => setFormErrors({...formErrors, 'student-email': null})} disabled={isVerified} />
                                    {isVerified ? (
                                        <div className="shrink-0 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 font-bold px-4 py-2.5 rounded-lg w-[116px] flex items-center justify-center gap-1">
                                            <span className="material-symbols-outlined text-[18px]">check_circle</span> Verified
                                        </div>
                                    ) : (
                                        <button type="button" id="student-verify-btn" disabled={isSendingOtp} onClick={() => sendOtp('student-email', 'Student')} className="shrink-0 bg-amber-300 text-slate-900 dark:text-white font-bold px-4 py-2.5 rounded-lg hover:bg-amber-400 transition-all shadow-sm cursor-pointer w-[116px] flex items-center justify-center gap-1 disabled:opacity-70 ">
                                        {isSendingOtp ? (
                                                <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Sending...</>
                                            ) : (
                                                'Verify'
                                            )}
                                        </button>
                                    )}
                                </div>
                                {formErrors['student-email'] ? (
                                    <p className="text-sm font-bold text-red-500 dark:text-red-400 mt-1">{formErrors['student-email']}</p>
                                ) : (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">* Must be a unique email address.</p>
                                )}
                                </>
                            );
                        })()}
                    </div>
                    
                    <div>
                        <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="student-password">Password</label>
                        <div className="relative">
                            <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all pr-12" type={showPasswords['student-password'] ? "text" : "password"} id="student-password" name="password" placeholder="••••••••" required />
                            <button type="button" onClick={() => togglePassword('student-password')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer outline-none">
                                <span className="material-symbols-outlined text-[20px]">{showPasswords['student-password'] ? "visibility_off" : "visibility"}</span>
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">* Will be securely hashed.</p>
                    </div>
                    
                    <div>
                        <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="student-confirm-password">Confirm Password</label>
                        <div className="relative">
                            <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all pr-12" type={showPasswords['student-confirm-password'] ? "text" : "password"} id="student-confirm-password" name="confirmPassword" placeholder="••••••••" required onChange={() => setFormErrors({...formErrors, 'student-password': null})} />
                            <button type="button" onClick={() => togglePassword('student-confirm-password')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer outline-none">
                                <span className="material-symbols-outlined text-[20px]">{showPasswords['student-confirm-password'] ? "visibility_off" : "visibility"}</span>
                            </button>
                        </div>
                        {formErrors['student-password'] && <p className="text-sm font-bold text-red-500 dark:text-red-400 mt-1">{formErrors['student-password']}</p>}
                    </div>
                    
                    <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white font-bold py-3 rounded-full text-base hover:bg-slate-800 active:scale-95 transition-all shadow-sm cursor-pointer mt-6 flex items-center justify-center gap-2 disabled:opacity-70 ">
                        {isSubmitting ? (
                            <><span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> Registering...</>
                        ) : (
                            'Create Active Account'
                        )}
                    </button>
                    
                    <div className="flex items-center gap-4 my-6">
                        <div className="h-px bg-slate-100 dark:bg-slate-700 flex-1"></div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">Or continue with</span>
                        <div className="h-px bg-slate-100 dark:bg-slate-700 flex-1"></div>
                    </div>
                    <button type="button" onClick={() => googleLogin()} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold py-3 rounded-full text-base hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-3">
                        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/google/google-original.svg" alt="Google Logo" className="w-5 h-5"/>
                        Sign in with Google
                    </button>
                    
                    <p className="text-center text-base font-medium text-slate-500 dark:text-slate-400 mt-6">
                        Already have an account? <button type="button" onClick={() => openModal('login-modal')} className="font-bold text-slate-900 dark:text-white hover:underline cursor-pointer outline-none">Sign In</button>
                    </p>
                </form>
            </div>
        </div>
    </div>
</div>

{/* DYNAMIC OTP MODAL POPUP */}
<div id="otp-modal" className={`fixed inset-0 z-[120] flex items-center justify-center p-4 transition-all duration-300 ${activeModal === 'otp-modal' ? 'opacity-100 backdrop-blur-md bg-slate-900/40' : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'}`}>
    <div className={`relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[24px] shadow-level-3 p-8 border border-slate-100 dark:border-slate-700 text-center transition-all duration-300 transform ${activeModal === 'otp-modal' ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        <button onClick={() => {
            if (otpContext === 'Student') openModal('register-student-modal');
            else if (otpContext === 'Teacher') openModal('register-teacher-modal');
            else if (otpContext.startsWith('AdminControls')) openModal('admin-controls-modal');
            else openModal('forgot-password-modal');
        }} className="absolute top-6 right-6 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-slate-900 dark:text-white">mark_email_read</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-slate-900 dark:text-white mb-2">Check your email</h2>
        <p className="text-base font-medium text-slate-500 dark:text-slate-400 mb-6">
            We sent a 5-digit {otpContext === 'Reset' ? 'reset' : 'verification'} code to your email.
        </p>
        
        <div className="flex justify-center gap-3 mb-2">
            {[0, 1, 2, 3, 4].map((index) => (
                <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    className="w-12 h-14 md:w-14 md:h-16 text-center text-headline-sm font-headline-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-slate-900 dark:text-white"
                    value={otpValues[index]}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                />
            ))}
        </div>
        {otpError && <p className="text-sm font-bold text-red-500 dark:text-red-400 mb-4">{otpError}</p>}
        {!otpError && <div className="mb-4"></div>}

        <button disabled={isVerifying} onClick={handleVerifyOtp} className="w-full bg-slate-900 text-white font-bold py-3 rounded-full text-base hover:bg-slate-800 active:scale-95 transition-all shadow-sm cursor-pointer flex justify-center items-center gap-2 disabled:opacity-70 disabled:active:scale-100">
            {isVerifying ? (
                <><span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> Verifying...</>
            ) : (
                'Verify Code'
            )}
        </button>

        <div className="text-center mt-6">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Didn't receive it? 
                {timers[otpContext] > 0 ? (
                    <span className="font-bold text-slate-900 dark:text-white ml-1">Resend in {timers[otpContext]}s</span>
                ) : (
                    <a href="#" onClick={(e) => { 
                        e.preventDefault(); 
                        if (otpContext === 'Reset') sendForgotOtp();
                        else if (otpContext.startsWith('AdminControls')) sendOtp(otpContext === 'AdminControls' ? 'admin-current-email' : 'admin-new-email', otpContext);
                        else sendOtp(otpContext === 'Student' ? 'student-email' : 'teacher-email', otpContext);
                    }} className="text-slate-900 dark:text-white font-bold hover:underline ml-1">Resend Code</a>
                )}
            </p>
        </div>
    </div>
</div>

{/* 3. NO-SCROLL TEACHER REGISTRATION FORM MODAL POPUP */}
<div id="register-teacher-modal" className={`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-all duration-300 ${activeModal === 'register-teacher-modal' ? 'opacity-100 backdrop-blur-md bg-slate-900/40' : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'}`}>
    <div className={`relative w-full max-w-5xl min-h-[700px] flex flex-col justify-center bg-white dark:bg-slate-800 rounded-[24px] shadow-level-3 p-8 md:p-12 border border-slate-100 dark:border-slate-700 overflow-hidden transition-all duration-300 transform ${activeModal === 'register-teacher-modal' ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        
        {/* Close Button */}
        <button onClick={closeModal} className="absolute top-6 right-6 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>

        {/* Two-Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            
            {/* Left Column: Branding & Intro */}
            <div className="flex flex-col items-center text-center md:border-r border-slate-100 dark:border-slate-700 md:pr-8">
                <div className="w-32 h-32 mb-6 rounded-full overflow-hidden bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                    <img src="https://cdn-icons-png.flaticon.com/512/3429/3429433.png" alt="Cartoon Teacher Avatar" className="w-24 h-24 object-contain drop-shadow-md hover:scale-110 transition-transform duration-300"/>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Teacher Application</h2>
                <p className="text-base font-medium text-slate-500 dark:text-slate-400 max-w-xs mb-4">Join our community of expert educators. Provide your details and credentials below.</p>
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">info</span>
                        Pending Review Process
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">To ensure scholarly excellence, all new teacher accounts are placed in a <strong>Pending status</strong>. Scheduling tools will unlock once an Administrator verifies your qualifications.</p>
                </div>
            </div>

            {/* Right Column: The Form */}
            <div>
                <form className="space-y-4" onSubmit={(e) => handleRegister(e, 'Teacher')} noValidate>
                    
                    {/* Side-by-Side Names Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* First Name */}
                        <div>
                            <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="teacher-firstname">First Name</label>
                            {(() => {
                                const emailVal = document.getElementById('teacher-email')?.value || '';
                                const isVerified = verifiedEmails[emailVal] && emailVal !== '';
                                return (
                                    <input className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all ${isVerified ? 'opacity-70 bg-slate-100 dark:bg-slate-700' : ''}`} type="text" id="teacher-firstname" name="firstName" placeholder="First name" required disabled={isVerified} onChange={() => { if (formErrors['teacher-firstname']) setFormErrors({...formErrors, 'teacher-firstname': null}); }} />
                                );
                            })()}
                            {formErrors['teacher-firstname'] && <p className="text-sm font-bold text-red-500 dark:text-red-400 mt-1">{formErrors['teacher-firstname']}</p>}
                        </div>

                        {/* Last Name (Optional) */}
                        <div>
                            <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="teacher-lastname">Last Name <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span></label>
                            <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type="text" id="teacher-lastname" name="lastName" placeholder="Last name" />
                        </div>
                    </div>

                    {/* Email with Verify Button */}
                    <div>
                        <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="teacher-email">Email Address</label>
                        
                        {(() => {
                            const emailVal = document.getElementById('teacher-email')?.value || '';
                            const isVerified = verifiedEmails[emailVal] && emailVal !== '';
                            return (
                                <>
                                <div className="flex gap-2">
                                    <input className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all ${isVerified ? 'opacity-70 bg-slate-100 dark:bg-slate-700' : ''}`} type="email" id="teacher-email" name="email" placeholder="teacher@example.com" required onChange={() => setFormErrors({...formErrors, 'teacher-email': null})} disabled={isVerified} />
                                    {isVerified ? (
                                        <div className="shrink-0 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 font-bold px-4 py-2.5 rounded-lg w-[116px] flex items-center justify-center gap-1">
                                            <span className="material-symbols-outlined text-[18px]">check_circle</span> Verified
                                        </div>
                                    ) : (
                                        <button type="button" id="teacher-verify-btn" disabled={isSendingOtp} onClick={() => sendOtp('teacher-email', 'Teacher')} className="shrink-0 bg-amber-300 text-slate-900 dark:text-white font-bold px-4 py-2.5 rounded-lg hover:bg-amber-400 transition-all shadow-sm cursor-pointer w-[116px] flex items-center justify-center gap-1 disabled:opacity-70 ">
                                        {isSendingOtp ? (
                                                <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Sending...</>
                                            ) : (
                                                'Verify'
                                            )}
                                        </button>
                                    )}
                                </div>
                                {formErrors['teacher-email'] && <p className="text-sm font-bold text-red-500 dark:text-red-400 mt-1">{formErrors['teacher-email']}</p>}
                                </>
                            );
                        })()}
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-slate-400 dark:text-slate-500">* Must be a unique email address.</p>
                            {/* Hidden Verified Text */}
                            <p id="teacher-verified-text" className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hidden flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span> Verified!
                            </p>
                        </div>
                        <p id="teacher-email-error" className="text-sm font-bold text-red-500 dark:text-red-400 hidden mt-1">Please enter a valid email address.</p>
                    </div>

                    {/* Professional Qualifications with Yellow Upload Button */}
                    <div>
                        <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="teacher-qualifications">Professional Qualifications</label>
                        <div className="flex gap-2">
                            <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type="text" id="teacher-qualifications" name="qualifications" placeholder="e.g. BSc. Mathematics" required onChange={() => { if (formErrors['teacher-qualifications']) setFormErrors({...formErrors, 'teacher-qualifications': null}); }} />
                            {/* Dynamic Upload Button */}
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
                            <button type="button" id="teacher-upload-btn" onClick={() => document.getElementById('teacher-qual-file').click()} disabled={isUploadingFile || !!teacherFile} className="shrink-0 bg-amber-300 text-slate-900 dark:text-white font-bold px-4 py-2.5 rounded-lg text-base hover:bg-amber-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm w-auto min-w-[116px] max-w-[200px] disabled:opacity-70 ">
                                {isUploadingFile ? (
                                    <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> <span className="truncate">Uploading...</span></>
                                ) : teacherFile ? (
                                    <><span className="material-symbols-outlined text-[18px]" id="teacher-upload-icon">check_circle</span> <span id="teacher-upload-text" className="truncate">Uploaded</span></>
                                ) : (
                                    <><span className="material-symbols-outlined text-[18px]" id="teacher-upload-icon">upload_file</span> <span id="teacher-upload-text" className="truncate">Upload</span></>
                                )}
                            </button>
                        </div>
                        {formErrors['teacher-qualifications'] && <p className="text-sm font-bold text-red-500 dark:text-red-400 mt-1">{formErrors['teacher-qualifications']}</p>}
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">* Required for administrative verification. Please upload certificates.</p>
                    </div>



                    {/* Password with Toggle (Stacked) */}
                    <div>
                        <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="teacher-password">Password</label>
                        <div className="relative">
                            <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-4 pr-10 py-2.5 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type={showPasswords['teacher-password'] ? 'text' : 'password'} id="teacher-password" name="password" placeholder="••••••••" required />
                            <button type="button" onClick={() => togglePassword('teacher-password')} className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors outline-none cursor-pointer">
                                <span id="teacher-eye-icon-1" className="material-symbols-outlined text-[18px]">{showPasswords['teacher-password'] ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">* Will be securely hashed.</p>
                    </div>

                    {/* Confirm Password with Toggle (Stacked) */}
                    <div>
                        <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="teacher-confirm-password">Confirm Password</label>
                        <div className="relative">
                            <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-4 pr-10 py-2.5 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type={showPasswords['teacher-confirm-password'] ? 'text' : 'password'} id="teacher-confirm-password" name="confirmPassword" placeholder="••••••••" required onChange={() => { if (formErrors['teacher-password']) setFormErrors({...formErrors, 'teacher-password': null}); }} />
                            <button type="button" onClick={() => togglePassword('teacher-confirm-password')} className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors outline-none cursor-pointer">
                                <span id="teacher-eye-icon-2" className="material-symbols-outlined text-[18px]">{showPasswords['teacher-confirm-password'] ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                        {formErrors['teacher-password'] && <p className="text-sm font-bold text-red-500 dark:text-red-400 mt-1">{formErrors['teacher-password']}</p>}
                    </div>

                    {/* Submit Button */}
                    <button disabled={isSubmitting} className="w-full bg-slate-900 text-white font-bold py-3 rounded-full text-base hover:bg-slate-800 active:scale-95 transition-all shadow-sm mt-4 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70" type="submit">
                        {isSubmitting ? (
                            <><span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> Submitting...</>
                        ) : (
                            'Submit Teacher Application'
                        )}
                    </button>
                </form>

                <div className="text-center mt-4">
                    <p className="text-base font-medium text-slate-500 dark:text-slate-400">Already an approved teacher? <a href="#" onClick={(e) => { e.preventDefault(); openModal('login-modal'); }} className="text-slate-900 dark:text-white font-bold hover:underline">Sign In</a></p>
                </div>
            </div>

        </div>
    </div>
</div>

{/* STUDENT OTP MODAL POPUP */}
<div id="otp-student-modal" className={`fixed inset-0 z-[130] flex items-center justify-center p-4 transition-all duration-300 ${activeModal === 'otp-student-modal' ? 'opacity-100 backdrop-blur-md bg-slate-900/40' : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'}`}>
    <div className={`relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[24px] shadow-level-3 p-8 border border-slate-100 dark:border-slate-700 text-center transition-all duration-300 transform ${activeModal === 'otp-student-modal' ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        {/* Close Button (Returns to Registration) */}
        <button onClick={() => openModal('register-student-modal')} className="absolute top-6 right-6 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer outline-none">
            <span className="material-symbols-outlined text-[28px]">close</span>
        </button>

        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-slate-900 dark:text-white">mark_email_read</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-slate-900 dark:text-white mb-2">Check your email</h2>
        <p className="text-base font-medium text-slate-500 dark:text-slate-400 mb-6">We sent a 5-digit verification code to your email address.</p>
        
        <div className="flex justify-center gap-3 mb-4">
            {[0, 1, 2, 3, 4].map(index => (
                <input key={index} type="text" maxLength={1} onKeyUp={(e) => handleOtpKeyUp(e, index, 'Student')} className="w-12 h-14 text-center font-headline-md text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
            ))}
        </div>
        <p id="otp-student-error" className="text-sm font-bold text-red-500 dark:text-red-400 hidden mb-4">Error text here</p>

        <button id="otp-student-verify-btn" disabled={isVerifying} onClick={() => verifyOtp('email', 'Student')} className="w-full bg-slate-900 text-white font-bold py-3 rounded-full text-base hover:bg-slate-800 active:scale-95 transition-all shadow-sm cursor-pointer flex justify-center items-center gap-2 disabled:opacity-70 disabled:active:scale-100">
            {isVerifying ? (
                <><span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> Verifying...</>
            ) : (
                'Verify Code'
            )}
        </button>
        <div className="mt-6 text-center">
            <p id="otp-student-resend-text" className="text-sm font-medium text-slate-500 dark:text-slate-400">Didn't receive it? Resend in <span id="otp-student-timer" className="font-bold">60</span>s</p>
            <a href="#" id="otp-student-resend-link" onClick={(e) => { e.preventDefault(); sendOtp('email', 'Student'); }} className="hidden text-sm font-medium text-slate-900 dark:text-white font-bold hover:underline">Resend Code</a>
        </div>
    </div>
</div>

{/* TEACHER OTP MODAL POPUP */}
<div id="otp-teacher-modal" className={`fixed inset-0 z-[130] flex items-center justify-center p-4 transition-all duration-300 ${activeModal === 'otp-teacher-modal' ? 'opacity-100 backdrop-blur-md bg-slate-900/40' : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'}`}>
    <div className={`relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[24px] shadow-level-3 p-8 border border-slate-100 dark:border-slate-700 text-center transition-all duration-300 transform ${activeModal === 'otp-teacher-modal' ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        {/* Close Button (Returns to Registration) */}
        <button onClick={() => openModal('register-teacher-modal')} className="absolute top-6 right-6 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer outline-none">
            <span className="material-symbols-outlined text-[28px]">close</span>
        </button>

        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-slate-900 dark:text-white">mark_email_read</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-slate-900 dark:text-white mb-2">Check your email</h2>
        <p className="text-base font-medium text-slate-500 dark:text-slate-400 mb-6">We sent a 5-digit verification code to your email address.</p>
        
        <div className="flex justify-center gap-3 mb-4">
            {[0, 1, 2, 3, 4].map(index => (
                <input key={index} type="text" maxLength={1} onKeyUp={(e) => handleOtpKeyUp(e, index, 'Teacher')} className="w-12 h-14 text-center font-headline-md text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
            ))}
        </div>
        <p id="otp-teacher-error" className="text-sm font-bold text-red-500 dark:text-red-400 hidden mb-4">Error text here</p>

        <button id="otp-teacher-verify-btn" disabled={isVerifying} onClick={() => verifyOtp('teacher-email', 'Teacher')} className="w-full bg-slate-900 text-white font-bold py-3 rounded-full text-base hover:bg-slate-800 active:scale-95 transition-all shadow-sm cursor-pointer flex justify-center items-center gap-2 disabled:opacity-70 disabled:active:scale-100">
            {isVerifying ? (
                <><span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> Verifying...</>
            ) : (
                'Verify Code'
            )}
        </button>
        <div className="mt-6 text-center">
            <p id="otp-teacher-resend-text" className="text-sm font-medium text-slate-500 dark:text-slate-400">Didn't receive it? Resend in <span id="otp-teacher-timer" className="font-bold">60</span>s</p>
            <a href="#" id="otp-teacher-resend-link" onClick={(e) => { e.preventDefault(); sendOtp('teacher-email', 'Teacher'); }} className="hidden text-sm font-medium text-slate-900 dark:text-white font-bold hover:underline">Resend Code</a>
        </div>
    </div>
</div>

{/* 3. LOGIN MODAL POPUP */}
<div id="login-modal" className={`fixed inset-0 z-[120] flex items-center justify-center p-4 transition-all duration-300 ${activeModal === 'login-modal' ? 'opacity-100 backdrop-blur-md bg-slate-900/40' : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'}`}>
    <div className={`relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-[24px] shadow-level-3 p-8 md:p-12 border border-slate-100 dark:border-slate-700 overflow-hidden transition-all duration-300 transform ${activeModal === 'login-modal' ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        
        {/* Close Button */}
        <button onClick={closeModal} className="absolute top-6 right-6 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>

        {/* Centered Header exactly like Register Modal */}
        <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Welcome Back!</h2>
            <p className=" text-lg font-medium text-slate-500 dark:text-slate-400">Enter your email and password to log in.</p>
        </div>

        {/* Two-Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            
            {/* Left Column: Branding Cartoons */}
            <div className="flex flex-col items-center justify-center text-center md:border-r border-slate-100 dark:border-slate-700 md:pr-8 gap-8">
                <div className="flex flex-row gap-8 justify-center">
                    {/* Student Image Box */}
                    <div className="flex flex-col items-center group cursor-pointer">
                        <div className="w-28 h-28 mb-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135810.png" alt="Student Avatar" className="w-20 h-20 object-contain drop-shadow-md"/>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white font-bold">Students</h3>
                    </div>
                    {/* Teacher Image Box */}
                    <div className="flex flex-col items-center group cursor-pointer">
                        <div className="w-28 h-28 mb-3 rounded-full overflow-hidden bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                            <img src="https://cdn-icons-png.flaticon.com/512/3429/3429433.png" alt="Teacher Avatar" className="w-20 h-20 object-contain drop-shadow-md"/>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white font-bold">Teachers</h3>
                    </div>
                </div>
                <p className="text-base font-medium text-slate-500 dark:text-slate-400 max-w-[280px]">
                    Access your unified A1 Academy account. Simply enter your credentials to continue your educational journey.
                </p>
            </div>

            {/* Right Column: The Login Form */}
            <div>
                <form onSubmit={handleLogin} className="space-y-4" noValidate>
                    
                    {/* Email */}
                    <div>
                        <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="login-email">Email Address</label>
                        <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type="email" id="login-email" name="email" placeholder="Enter your email" required />
                    </div>

                    {/* Password with Toggle & Forgot Link */}
                    <div>
                        <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="login-password">Password</label>
                        <div className="relative">
                            <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-4 pr-10 py-3 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type={showPasswords['login-password'] ? 'text' : 'password'} id="login-password" name="password" placeholder="••••••••" required />
                            <button type="button" onClick={() => togglePassword('login-password')} className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors outline-none cursor-pointer">
                                <span id="login-eye-icon" className="material-symbols-outlined text-[18px]">{showPasswords['login-password'] ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                        {/* Forgot Password Link & Error Msg */}
                        <div className="flex justify-between items-center mt-2">
                            <div className="flex-1">
                                {loginErrors['password'] && (
                                    <p className="text-sm font-bold text-red-500 dark:text-red-400">
                                        {loginErrors['password']}
                                    </p>
                                )}
                            </div>
                            <a href="#" onClick={(e) => { e.preventDefault(); startForgotPasswordFlow(); }} className="text-sm font-bold text-slate-900 dark:text-white hover:underline">Forgot password?</a>
                        </div>
                    </div>

                    {/* General Error Message */}
                    {loginErrors['general'] && (
                        <p className="text-sm font-bold text-red-500 dark:text-red-400 mt-1 mb-4 text-left">
                            {loginErrors['general']}
                        </p>
                    )}

                    {/* Submit Button */}
                    <button disabled={isLoggingIn} className="w-full bg-slate-900 text-white font-bold py-3 rounded-full text-base hover:bg-slate-800 disabled:opacity-70 active:scale-95 transition-all shadow-sm mt-2 cursor-pointer" type="submit">
                        {isLoggingIn ? 'Logging In...' : 'Log In'}
                    </button>
                    
                    {/* Google Sign In Divider */}
                    <div className="relative mt-6 mb-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-100 dark:border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs">Or continue with</span>
                        </div>
                    </div>

                    {/* Google Sign In Button */}
                    <button type="button" onClick={() => googleLogin()} className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-3 text-base font-medium font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm cursor-pointer">
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                        Sign in with Google
                    </button>
                </form>

                {/* Registration Link */}
                <div className="text-center mt-8">
                    <p className="text-base font-medium text-slate-500 dark:text-slate-400">Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); openModal('register-modal'); }} className="text-slate-900 dark:text-white font-bold hover:underline">Register here</a></p>
                </div>
            </div>

        </div>
    </div>
</div>

{/* STUDENT SUCCESS MODAL POPUP */}
<div id="success-student-modal" className={`fixed inset-0 z-[140] flex items-center justify-center p-4 transition-all duration-300 ${activeModal === 'success-student-modal' ? 'opacity-100 backdrop-blur-md bg-slate-900/40' : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'}`}>
    <div className={`relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-[24px] shadow-level-3 p-8 border border-slate-100 dark:border-slate-700 text-center transition-all duration-300 transform ${activeModal === 'success-student-modal' ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-bounce shadow-sm">
            <span className="text-[48px]">🎉</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-slate-900 dark:text-white mb-2">Congratulations!</h2>
        <p className="text-base font-medium text-slate-500 dark:text-slate-400 mb-8">You are now a member of A1 Academy! Start browsing courses and earning your digital badges today.</p>
        
        <button onClick={() => openModal('login-modal')} className="w-full bg-slate-900 text-white font-bold py-3 rounded-full text-base hover:bg-slate-800 active:scale-95 transition-all shadow-sm cursor-pointer">Continue to Login</button>
    </div>
</div>

{/* TEACHER PENDING MODAL POPUP */}
<div id="pending-teacher-modal" className={`fixed inset-0 z-[140] flex items-center justify-center p-4 transition-all duration-300 ${activeModal === 'pending-teacher-modal' ? 'opacity-100 backdrop-blur-md bg-slate-900/40' : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'}`}>
    <div className={`relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-[24px] shadow-level-3 p-8 border border-slate-100 dark:border-slate-700 text-center transition-all duration-300 transform ${activeModal === 'pending-teacher-modal' ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-amber-300 flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[48px] text-slate-900 dark:text-white animate-pulse">hourglass_top</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-slate-900 dark:text-white mb-2">Application Submitted!</h2>
        <p className="text-base font-medium text-slate-500 dark:text-slate-400 mb-8">Your credentials have been sent to our Administrators for verification. Once approved, you will receive an email notification and can log in to access your dashboard.</p>
        
        <button onClick={closeModal} className="w-full bg-slate-900 text-white font-bold py-3 rounded-full text-base hover:bg-slate-800 active:scale-95 transition-all shadow-sm cursor-pointer">Got it!</button>
    </div>
</div>

{/* FORGOT PASSWORD: STEP 1 (EMAIL REQUEST) */}
<div id="forgot-password-modal" className={`fixed inset-0 z-[130] flex items-center justify-center p-4 transition-all duration-300 ${activeModal === 'forgot-password-modal' ? 'opacity-100 backdrop-blur-md bg-slate-900/40' : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'}`}>
    <div className={`relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[24px] shadow-level-3 p-8 border border-slate-100 dark:border-slate-700 text-center transition-all duration-300 transform ${activeModal === 'forgot-password-modal' ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        <button onClick={() => openModal('login-modal')} className="absolute top-6 right-6 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-slate-900 dark:text-white">lock_reset</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-slate-900 dark:text-white mb-2">Reset Password</h2>
        <p className="text-base font-medium text-slate-500 dark:text-slate-400 mb-6">Enter the email address associated with your account, and we'll send you a code to reset your password.</p>
        <div className="text-left mb-4">
            <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="forgot-firstname">First Name</label>
            <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type="text" id="forgot-firstname" placeholder="e.g. Nilavan" required onChange={() => document.getElementById('forgot-error').classList.add('hidden')} />
        </div>
        <div className="text-left mb-6">
            <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="forgot-email">Email Address</label>
            <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type="email" id="forgot-email" placeholder="e.g. hello@example.com" required onChange={() => document.getElementById('forgot-error').classList.add('hidden')} />
            <p id="forgot-error" className="text-sm font-bold text-red-500 dark:text-red-400 hidden mt-2"></p>
        </div>
        <button onClick={sendForgotOtp} disabled={isSendingOtp} className="w-full bg-slate-900 text-white font-bold py-3 rounded-full text-base hover:bg-slate-800 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100">
            {isSendingOtp ? (
                <><span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> Sending...</>
            ) : (
                'Send Reset Code'
            )}
        </button>
    </div>
</div>

{/* FORGOT PASSWORD: STEP 3 (NEW PASSWORD) */}
<div id="new-password-modal" className={`fixed inset-0 z-[150] flex items-center justify-center p-4 transition-all duration-300 ${activeModal === 'new-password-modal' ? 'opacity-100 backdrop-blur-md bg-slate-900/40' : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'}`}>
    <div className={`relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[24px] shadow-level-3 p-8 border border-slate-100 dark:border-slate-700 text-center transition-all duration-300 transform ${activeModal === 'new-password-modal' ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        <button onClick={() => openModal('login-modal')} className="absolute top-6 right-6 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-slate-900 dark:text-white">key</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-slate-900 dark:text-white mb-2">Create New Password</h2>
        <p className="text-base font-medium text-slate-500 dark:text-slate-400 mb-6">Your identity has been verified. Please set a new password for your account.</p>
        
        <div className="text-left mb-4">
            <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="reset-new-password">New Password</label>
            <div className="relative">
                <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all pr-12" type={showPasswords['reset-new-password'] ? "text" : "password"} id="reset-new-password" placeholder="Enter new password" required onChange={() => document.getElementById('reset-password-error').classList.add('hidden')} />
                <button type="button" onClick={() => togglePassword('reset-new-password')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer outline-none">
                    <span className="material-symbols-outlined text-[20px]">{showPasswords['reset-new-password'] ? "visibility_off" : "visibility"}</span>
                </button>
            </div>
        </div>
        <div className="text-left mb-6">
            <label className="block font-bold text-slate-900 dark:text-white mb-1" htmlFor="reset-confirm-password">Confirm Password</label>
            <div className="relative">
                <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-base font-medium text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all pr-12" type={showPasswords['reset-confirm-password'] ? "text" : "password"} id="reset-confirm-password" placeholder="Confirm new password" required onChange={() => document.getElementById('reset-password-error').classList.add('hidden')} />
                <button type="button" onClick={() => togglePassword('reset-confirm-password')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer outline-none">
                    <span className="material-symbols-outlined text-[20px]">{showPasswords['reset-confirm-password'] ? "visibility_off" : "visibility"}</span>
                </button>
            </div>
            <p id="reset-password-error" className="text-sm font-bold text-red-500 dark:text-red-400 hidden mt-1">Passwords do not match.</p>
        </div>

        <button onClick={saveNewPassword} className="w-full bg-slate-900 text-white font-bold py-3 rounded-full text-base hover:bg-slate-800 active:scale-95 transition-all shadow-sm cursor-pointer">Save New Password</button>
    </div>
</div>

{/* FORGOT PASSWORD: STEP 4 (SUCCESS ANIMATION) */}
<div id="success-reset-modal" className={`fixed inset-0 z-[160] flex items-center justify-center p-4 transition-all duration-300 ${activeModal === 'success-reset-modal' ? 'opacity-100 backdrop-blur-md bg-slate-900/40' : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'}`}>
    <div className={`relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-[24px] shadow-level-3 p-8 border border-slate-100 dark:border-slate-700 text-center transition-all duration-300 transform ${activeModal === 'success-reset-modal' ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[48px] text-emerald-600 dark:text-emerald-400">check_circle</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-slate-900 dark:text-white mb-2">Password Reset!</h2>
        <p className="text-base font-medium text-slate-500 dark:text-slate-400 mb-8">Your password has been successfully updated. You can now log in with your new credentials.</p>
        
        <button onClick={() => openModal('login-modal')} className="w-full bg-slate-900 text-white font-bold py-3 rounded-full text-base hover:bg-slate-800 active:scale-95 transition-all shadow-sm cursor-pointer">Return to Login</button>
    </div>
</div>

{/* SUCCESS LOGIN MODAL (EASTER EGG) */}
<div id="success-login-modal" className={`fixed inset-0 z-[160] flex items-center justify-center p-4 transition-all duration-300 ${activeModal === 'success-login-modal' ? 'opacity-100 backdrop-blur-md bg-slate-900/40' : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'}`}>
    <div className={`relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-[24px] shadow-level-3 p-12 border border-slate-100 dark:border-slate-700 text-center overflow-hidden transition-all duration-300 transform ${activeModal === 'success-login-modal' ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        {/* Fun decorative background elements */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-20 right-10 w-20 h-20 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10">
            <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-tr from-pink-400 to-purple-500 flex items-center justify-center shadow-lg animate-bounce">
                <span className="material-symbols-outlined text-[64px] text-white">favorite</span>
            </div>
            <h2 className="font-display-lg text-[48px] font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-red-500 to-purple-500 mb-4 tracking-tight drop-shadow-sm">
                Welcome
            </h2>
            <p className="text-lg font-medium text-slate-500 dark:text-slate-400 mb-10 font-medium">
                You have successfully logged in to A1 Academy!
            </p>
            
            <button onClick={() => window.location.href = '/'} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-label-lg py-4 rounded-full hover:shadow-lg active:scale-95 transition-all shadow-sm cursor-pointer font-bold text-lg">
                Back to Home
            </button>
        </div>
    </div>
</div>

{/* ADMIN CONTROLS MODAL POPUP */}
<div id="admin-controls-modal" className={`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-all duration-300 ${activeModal === 'admin-controls-modal' ? 'opacity-100 backdrop-blur-md bg-slate-900/40' : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'}`}>
    <div className={`relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-[24px] shadow-level-3 p-8 md:p-12 border border-slate-100 dark:border-slate-700 overflow-hidden transition-all duration-300 transform ${activeModal === 'admin-controls-modal' ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        
        {/* Close Button */}
        <button onClick={closeModal} className="absolute top-6 right-6 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Left Column: Branding */}
            <div className="flex flex-col items-center text-center md:border-r border-slate-100 dark:border-slate-700 md:pr-8">
                <div className="w-32 h-32 mb-6 rounded-full overflow-hidden bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[64px]">manage_accounts</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Admin Controls</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs font-medium">Update your administrator email address or reset your password securely.</p>
            </div>

            {/* Right Column: The Form */}
            <div>
                <form className="space-y-4" onSubmit={async (e) => {
                    e.preventDefault();
                    const currentEmail = document.getElementById('admin-current-email')?.value;
                    if (!verifiedEmails[currentEmail]) {
                        setFormErrors(prev => ({...prev, 'admin-current-email': 'Please verify your current email first.'}));
                        return;
                    }
                    const newEmail = document.getElementById('admin-new-email')?.value;
                    if (newEmail && !verifiedEmails[newEmail]) {
                        setFormErrors(prev => ({...prev, 'admin-new-email': 'Please verify your new email.'}));
                        return;
                    }
                    const newPassword = document.getElementById('admin-new-password')?.value;
                    const confirmPassword = document.getElementById('admin-confirm-password')?.value;
                    if (newPassword && newPassword !== confirmPassword) {
                        setFormErrors(prev => ({...prev, 'admin-confirm-password': 'Passwords do not match.'}));
                        return;
                    }
                    
                    // Call API to update credentials
                    const token = localStorage.getItem('token');
                    try {
                        const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/me/credentials', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ currentEmail, newEmail, newPassword })
                        });
                        if (res.ok) {
                            alert('Credentials updated successfully. Please log in again.');
                            localStorage.removeItem('token');
                            window.location.href = '/';
                        } else {
                            const text = await res.text();
                            alert(text || 'Failed to update credentials.');
                        }
                    } catch(err) {
                        console.error(err);
                        alert('Error updating credentials.');
                    }
                }}>
                    
                    {/* Current Email (with Verify Button) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Current Email Address</label>
                        <div className="flex gap-2">
                            <input id="admin-current-email" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type="email" placeholder="current@a1academy.com" required onChange={() => setFormErrors({...formErrors, 'admin-current-email': null})} />
                            {(() => {
                                const emailVal = document.getElementById('admin-current-email')?.value || '';
                                const isVerified = verifiedEmails[emailVal] && emailVal !== '';
                                return isVerified ? (
                                    <div className="shrink-0 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 font-bold px-4 py-2.5 rounded-lg w-[116px] flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-[18px]">check_circle</span> Verified
                                    </div>
                                ) : (
                                    <button type="button" disabled={isSendingOtp} onClick={async () => {
                                        const email = document.getElementById('admin-current-email')?.value;
                                        if (!email) {
                                            setFormErrors({...formErrors, 'admin-current-email': 'Please enter your current email.'});
                                            return;
                                        }
                                        const token = localStorage.getItem('token');
                                        const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` }});
                                        if (res.ok) {
                                            const profile = await res.json();
                                            if (profile.email !== email) {
                                                setFormErrors({...formErrors, 'admin-current-email': 'This is not your registered email.'});
                                                return;
                                            }
                                            sendOtp('admin-current-email', 'AdminControls');
                                        } else {
                                            setFormErrors({...formErrors, 'admin-current-email': 'Failed to verify account identity.'});
                                        }
                                    }} className="shrink-0 bg-amber-300 text-slate-900 dark:text-white font-bold px-4 py-2.5 rounded-lg hover:bg-amber-400 transition-all shadow-sm cursor-pointer w-[116px] flex items-center justify-center gap-1 disabled:opacity-70 ">
                                        {isSendingOtp ? (
                                            <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Sending...</>
                                        ) : (
                                            'Verify'
                                        )}
                                    </button>
                                );
                            })()}
                        </div>
                        {formErrors['admin-current-email'] && <p className="text-sm font-bold text-red-500 dark:text-red-400 mt-1">{formErrors['admin-current-email']}</p>}
                    </div>

                    {/* New Email */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">New Email Address <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span></label>
                        <div className="flex gap-2">
                            <input id="admin-new-email" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type="email" placeholder="new@a1academy.com" onChange={() => setFormErrors({...formErrors, 'admin-new-email': null})} />
                            {(() => {
                                const emailVal = document.getElementById('admin-new-email')?.value || '';
                                const isVerified = verifiedEmails[emailVal] && emailVal !== '';
                                return isVerified ? (
                                    <div className="shrink-0 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 font-bold px-4 py-2.5 rounded-lg w-[116px] flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-[18px]">check_circle</span> Verified
                                    </div>
                                ) : (
                                    <button type="button" disabled={isSendingOtp} onClick={async () => {
                                        const email = document.getElementById('admin-new-email')?.value;
                                        if (!email) {
                                            setFormErrors({...formErrors, 'admin-new-email': 'Please enter a new email to verify.'});
                                            return;
                                        }
                                        sendOtp('admin-new-email', 'AdminControlsNewEmail');
                                    }} className="shrink-0 bg-amber-300 text-slate-900 dark:text-white font-bold px-4 py-2.5 rounded-lg hover:bg-amber-400 transition-all shadow-sm cursor-pointer w-[116px] flex items-center justify-center gap-1 disabled:opacity-70 ">
                                        {isSendingOtp ? (
                                            <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Sending...</>
                                        ) : (
                                            'Verify'
                                        )}
                                    </button>
                                );
                            })()}
                        </div>
                        {formErrors['admin-new-email'] && <p className="text-sm font-bold text-red-500 dark:text-red-400 mt-1">{formErrors['admin-new-email']}</p>}
                    </div>

                    {/* Passwords */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">New Password</label>
                            <input id="admin-new-password" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type="password" placeholder="••••••••" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Confirm Password</label>
                            <input id="admin-confirm-password" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type="password" placeholder="••••••••" onChange={() => { if(formErrors['admin-confirm-password']) setFormErrors({...formErrors, 'admin-confirm-password': null}); }}/>
                            {formErrors['admin-confirm-password'] && <p className="text-sm font-bold text-red-500 dark:text-red-400 mt-1">{formErrors['admin-confirm-password']}</p>}
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 text-white font-bold text-sm px-4 py-3.5 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md flex justify-center items-center gap-2 mt-4">
                        <span className="material-symbols-outlined text-[20px]">shield_person</span> Update Credentials
                    </button>
                    <p className="text-xs text-center text-slate-500 dark:text-slate-400 font-medium mt-2">You will need to verify these changes via OTP.</p>
                </form>
            </div>
        </div>
    </div>
</div>

        </>
    );
}
