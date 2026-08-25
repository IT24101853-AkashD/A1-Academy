import React, { useState, useEffect } from 'react';

export default function AuthModals({ activeModal, setActiveModal, openModal, closeModal }) {
    const [showPasswords, setShowPasswords] = useState({});
    const [timers, setTimers] = useState({ 'Student': 0, 'Teacher': 0, 'Reset': 0 });
    const [isVerifying, setIsVerifying] = useState(false);
    const [otpContext, setOtpContext] = useState(null);
    const [forgotEmail, setForgotEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loginRole, setLoginRole] = useState('student');

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
        const email = document.getElementById(emailId).value;
        if (!email) {
            alert('Please enter your email first.');
            return;
        }
        try {
            const res = await fetch('http://localhost:5123/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.ok) {
                setOtpContext(role);
                openModal('otp-modal');
                startOtpTimer(role);
            } else {
                alert('Failed to send OTP.');
            }
        } catch (err) {
            alert('Server error.');
        }
    };

    const sendForgotOtp = async () => {
        const emailInput = document.getElementById('forgot-email').value;
        const firstNameInput = document.getElementById('forgot-firstname').value;
        if (!emailInput || !firstNameInput) {
            document.getElementById('forgot-error').classList.remove('hidden');
            return;
        }
        document.getElementById('forgot-error').classList.add('hidden');
        setForgotEmail(emailInput);
        setIsSubmitting(true);
        
        try {
            const res = await fetch('http://localhost:5123/api/auth/forgot-password-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput, firstName: firstNameInput })
            });
            if (res.ok) {
                setOtpContext('Reset');
                openModal('otp-modal');
                startOtpTimer('Reset');
            } else {
                document.getElementById('forgot-error').classList.remove('hidden');
            }
        } catch (err) {
            alert('Server error.');
        } finally {
            setIsSubmitting(false);
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

    const handleVerifyOtp = async () => {
        const inputs = document.querySelectorAll('#otp-modal input[type="text"]');
        let otp = '';
        inputs.forEach(input => otp += input.value);
        
        const errorEl = document.getElementById('otp-error');
        if (otp.length !== 5) {
            errorEl.innerText = 'Please enter the full 5-digit code.';
            errorEl.classList.remove('hidden');
            return;
        }
        errorEl.classList.add('hidden');
        setIsVerifying(true);

        try {
            if (otpContext === 'Reset') {
                const res = await fetch('http://localhost:5123/api/auth/verify-reset-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: forgotEmail, otp })
                });
                if (res.ok) {
                    const data = await res.json();
                    setResetToken(data.token);
                    openModal('new-password-modal');
                } else {
                    errorEl.innerText = 'Invalid or expired OTP. Please check again.';
                    errorEl.classList.remove('hidden');
                }
            } else {
                const email = otpContext === 'Student' 
                    ? document.getElementById('email').value 
                    : document.getElementById('teacher-email').value;
                const res = await fetch('http://localhost:5123/api/auth/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, otp })
                });
                if (res.ok) {
                    openModal(otpContext === 'Student' ? 'register-student-modal' : 'register-teacher-modal');
                    if (otpContext === 'Student') {
                        document.getElementById('verify-btn').classList.add('hidden');
                        document.getElementById('verified-text').classList.remove('hidden');
                    } else {
                        document.getElementById('teacher-verify-btn').classList.add('hidden');
                        document.getElementById('teacher-verified-text').classList.remove('hidden');
                    }
                } else {
                    errorEl.innerText = 'Invalid or expired OTP. Please check again.';
                    errorEl.classList.remove('hidden');
                }
            }
        } catch (err) {
            errorEl.innerText = 'Server connection error.';
            errorEl.classList.remove('hidden');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleRegister = async (e, role) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.role = role;
        
        if (data.password !== data.confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        try {
            const res = await fetch('http://localhost:5123/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                const result = await res.json();
                closeModal();
                if (result.isApproved) {
                    openModal('success-student-modal');
                } else {
                    openModal('pending-teacher-modal');
                }
            } else {
                const text = await res.text();
                alert('Registration failed: ' + text);
            }
        } catch (err) {
            alert('Server connection error.');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch('http://localhost:5123/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                const result = await res.json();
                localStorage.setItem('token', result.token);
                localStorage.setItem('role', result.role);
                closeModal();
                window.location.reload();
            } else {
                document.getElementById('login-error').classList.remove('hidden');
            }
        } catch (err) {
            alert('Server connection error.');
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
        <button onClick={closeModal} className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
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
                <form className="space-y-4" onSubmit={(e) => handleRegister(e, 'Student')}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-label-md text-on-surface mb-1" htmlFor="student-firstname">First Name</label>
                            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="student-firstname" name="firstName" placeholder="First name" required />
                        </div>
                        <div>
                            <label className="block font-label-md text-on-surface mb-1" htmlFor="student-lastname">Last Name <span className="text-outline font-normal">(Optional)</span></label>
                            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="student-lastname" name="lastName" placeholder="Last name" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block font-label-md text-on-surface mb-1" htmlFor="student-email">Email Address</label>
                        <div className="flex gap-2">
                            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="email" id="student-email" name="email" placeholder="student@example.com" required />
                            <button type="button" id="student-verify-btn" disabled={isSubmitting} onClick={() => sendOtp('student-email', 'Student')} className="shrink-0 bg-secondary-container text-on-secondary-container font-label-md px-4 py-2.5 rounded-lg hover:bg-secondary-fixed transition-all shadow-sm cursor-pointer w-[116px] flex items-center justify-center gap-1 disabled:opacity-70 disabled:cursor-not-allowed">
                                {isSubmitting ? (
                                    <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Sending...</>
                                ) : (
                                    'Verify'
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-1">* Must be a unique email address.</p>
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
                            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-12" type={showPasswords['student-confirm-password'] ? "text" : "password"} id="student-confirm-password" name="confirmPassword" placeholder="••••••••" required />
                            <button type="button" onClick={() => togglePassword('student-confirm-password')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer outline-none">
                                <span className="material-symbols-outlined text-[20px]">{showPasswords['student-confirm-password'] ? "visibility_off" : "visibility"}</span>
                            </button>
                        </div>
                    </div>
                    
                    <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer mt-6 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
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
                    
                    <button type="button" className="w-full bg-surface border border-outline-variant text-on-surface font-label-md py-3 rounded-full hover:bg-surface-container-low transition-all shadow-sm cursor-pointer flex items-center justify-center gap-3">
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
        
        <div className="flex justify-center gap-3 mb-4">
            {[0, 1, 2, 3, 4].map(index => (
                <input key={index} type="text" maxLength={1} onKeyUp={(e) => handleOtpKeyUp(e, index)} className="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            ))}
        </div>
        <p id="otp-error" className="text-sm text-error font-bold hidden mb-4">Error text here</p>

        <button disabled={isVerifying} onClick={handleVerifyOtp} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100">
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
                        else sendOtp(otpContext === 'Student' ? 'email' : 'teacher-email', otpContext);
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
        <button onClick={closeModal} className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
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
                <form className="space-y-4" onSubmit={(e) => handleRegister(e, 'Student')}>
                    
                    {/*  Side-by-Side Names Grid  */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/*  First Name  */}
                        <div>
                            <label className="block font-label-md text-on-surface mb-1" htmlFor="teacher-firstname">First Name</label>
                            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="teacher-firstname" name="firstName" placeholder="First name" required />
                            <p id="teacher-firstname-error" className="text-xs text-error font-bold hidden mt-1">Please provide your First Name.</p>
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
                        <div className="flex gap-2">
                            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="email" id="teacher-email" name="email" placeholder="teacher@example.com" required />
                            <button type="button" id="teacher-verify-btn" disabled={isSubmitting} onClick={() => sendOtp('teacher-email', 'Teacher')} className="shrink-0 bg-secondary-container text-on-secondary-container font-label-md px-4 py-2.5 rounded-lg hover:bg-secondary-fixed transition-all shadow-sm cursor-pointer w-[116px] flex items-center justify-center gap-1 disabled:opacity-70 disabled:cursor-not-allowed">
                                {isSubmitting ? (
                                    <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Sending...</>
                                ) : (
                                    'Verify'
                                )}
                            </button>
                        </div>
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
                            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="teacher-qualifications" name="qualifications" placeholder="e.g. BSc. Mathematics" required />
                            {/*  Yellow Upload Button  */}
                            <input type="file" id="teacher-qual-file" name="QualificationDocument" className="hidden"  />
                            <button type="button" id="teacher-upload-btn" onClick={() => document.getElementById('teacher-qual-file').click()} className="shrink-0 bg-secondary-container text-on-secondary-container font-label-md px-4 py-2.5 rounded-lg hover:bg-secondary-fixed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm w-[116px]">
                                <span className="material-symbols-outlined text-[18px]" id="teacher-upload-icon">upload_file</span> 
                                <span id="teacher-upload-text">Upload</span>
                            </button>
                        </div>
                        <p id="teacher-qualifications-error" className="text-xs text-error font-bold hidden mt-1">Please provide your professional qualifications.</p>
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
                            <input className="w-full bg-surface border border-outline-variant rounded-lg pl-4 pr-10 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type={showPasswords['teacher-confirm-password'] ? 'text' : 'password'} id="teacher-confirm-password" name="confirmPassword" placeholder="••••••••" required  />
                            <button type="button" onClick={() => togglePassword('teacher-confirm-password')} className="absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-primary transition-colors outline-none cursor-pointer">
                                <span id="teacher-eye-icon-2" className="material-symbols-outlined text-[18px]">{showPasswords['teacher-confirm-password'] ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                        <p id="teacher-password-error" className="text-xs text-error font-bold hidden mt-1">Passwords do not match.</p>
                    </div>

                    {/*  Submit Button  */}
                    <button className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm mt-4 cursor-pointer" type="submit">
                        Submit Teacher Application
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

        <button id="otp-student-verify-btn" disabled={isVerifying} onClick={() => verifyOtp('email', 'Student')} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100">
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

        <button id="otp-teacher-verify-btn" disabled={isVerifying} onClick={() => verifyOtp('teacher-email', 'Teacher')} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100">
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
            <p className="font-body-lg text-body-lg text-on-surface-variant">Select your role to log in to your account.</p>
        </div>

        {/*  Two-Column Grid Layout  */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            
            {/*  Left Column: Branding & Role Toggles  */}
            <div className="flex flex-col items-center justify-center text-center md:border-r border-surface-variant md:pr-8">
                <div className="w-32 h-32 mb-8 rounded-full overflow-hidden flex items-center justify-center">
                    <img src="https://cdn-icons-png.flaticon.com/512/3135/3135810.png" id="login-avatar" alt="Login Avatar" className="w-24 h-24 object-contain drop-shadow-md transition-transform duration-300"/>
                </div>

                {/*  Role Selection Toggles  */}
                <div className="grid grid-cols-2 gap-4 w-full">
                    {/*  Student Box (Default Active)  */}
                    <div id="login-role-student" onClick={() => setLoginRole('student')} className={loginRole === 'student' ? 'border-2 border-primary bg-primary-fixed/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300' : 'border-2 border-surface-variant bg-surface hover:border-outline-variant rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300'}>
                        <span className={loginRole === 'student' ? 'font-label-md text-primary font-bold' : 'font-label-md text-on-surface-variant'}>Student</span>
                    </div>

                    {/*  Teacher Box  */}
                    <div id="login-role-teacher" onClick={() => setLoginRole('teacher')} className={loginRole === 'teacher' ? 'border-2 border-primary bg-primary-fixed/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300' : 'border-2 border-surface-variant bg-surface hover:border-outline-variant rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300'}>
                        <span className={loginRole === 'teacher' ? 'font-label-md text-primary font-bold' : 'font-label-md text-on-surface-variant'}>Teacher</span>
                    </div>
                </div>
            </div>

            {/*  Right Column: The Login Form  */}
            <div>
                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                    
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
                        {/*  Forgot Password Link  */}
                        <div className="flex justify-end mt-2">
                            <a href="#" onClick={(e) => { e.preventDefault(); startForgotPasswordFlow(); }} className="text-sm font-label-md text-primary hover:underline">Forgot password?</a>
                        </div>
                    </div>

                    {/*  Hidden Error Simulation Message  */}
                    <p id="login-error" className="hidden text-sm text-error font-medium bg-error-container p-3 rounded-lg border border-error/20 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">error</span>
                        Invalid email or password.
                    </p>

                    {/*  Submit Button  */}
                    <button className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm mt-2 cursor-pointer" type="submit">
                        Log In
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
                    <button type="button" className="w-full flex items-center justify-center gap-3 bg-white border border-outline-variant rounded-full px-4 py-3 text-body-md font-label-md text-on-surface hover:bg-surface-container-low transition-all shadow-sm cursor-pointer">
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
            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="forgot-firstname" placeholder="e.g. John" required />
        </div>
        <div className="text-left mb-6">
            <label className="block font-label-md text-on-surface mb-1" htmlFor="forgot-email">Email Address</label>
            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="email" id="forgot-email" placeholder="e.g. hello@example.com" required />
            <p id="forgot-error" className="text-sm text-error font-bold hidden mt-2">Please enter both fields.</p>
        </div>
        <button onClick={sendForgotOtp} disabled={isSubmitting} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100">
            {isSubmitting ? (
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
                <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="password" id="reset-new-password" placeholder="Enter new password" required  />
            </div>
        </div>
        <div className="text-left mb-6">
            <label className="block font-label-md text-on-surface mb-1" htmlFor="reset-confirm-password">Confirm Password</label>
            <div className="relative">
                <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="password" id="reset-confirm-password" placeholder="Confirm new password" required  />
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
        </>
    );
}
