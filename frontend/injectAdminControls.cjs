const fs = require('fs');
const path = require('path');

const authModalsPath = path.join(__dirname, 'src', 'components', 'AuthModals.jsx');
let content = fs.readFileSync(authModalsPath, 'utf8');

// 1. Update timers state
content = content.replace(
    /const \[timers, setTimers\] = useState\(\{ 'Student': 0, 'Teacher': 0, 'Reset': 0 \}\);/,
    "const [timers, setTimers] = useState({ 'Student': 0, 'Teacher': 0, 'Reset': 0, 'AdminControls': 0 });"
);

// 2. Update sendOtp
const sendOtpOld = `const firstNameId = role === 'Student' ? 'student-firstname' : 'teacher-firstname';
        const firstName = document.getElementById(firstNameId)?.value;
        const email = document.getElementById(emailId)?.value;

        if (!firstName) {
            setFormErrors({...formErrors, [firstNameId]: 'First name is required before verifying email.'});
            return;
        }`;

const sendOtpNew = `const firstNameId = role === 'Student' ? 'student-firstname' : 'teacher-firstname';
        const firstName = role === 'AdminControls' ? 'Admin' : document.getElementById(firstNameId)?.value;
        const email = document.getElementById(emailId)?.value;

        if (!firstName && role !== 'AdminControls') {
            setFormErrors({...formErrors, [firstNameId]: 'First name is required before verifying email.'});
            return;
        }`;
content = content.replace(sendOtpOld, sendOtpNew);

// 3. Update handleVerifyOtp (bodyData)
const handleVerifyOtpOld = `if (otpContext === 'Reset') {
                endpoint = import.meta.env.VITE_API_URL + '/api/auth/verify-reset-otp';
                bodyData = { email: document.getElementById('forgot-email')?.value, otp };
            } else {
                const emailId = otpContext === 'Student' ? 'student-email' : 'teacher-email';
                bodyData = { email: document.getElementById(emailId)?.value, otp };
            }`;

const handleVerifyOtpNew = `if (otpContext === 'Reset') {
                endpoint = import.meta.env.VITE_API_URL + '/api/auth/verify-reset-otp';
                bodyData = { email: document.getElementById('forgot-email')?.value, otp };
            } else if (otpContext === 'AdminControls') {
                bodyData = { email: document.getElementById('admin-current-email')?.value, otp };
            } else {
                const emailId = otpContext === 'Student' ? 'student-email' : 'teacher-email';
                bodyData = { email: document.getElementById(emailId)?.value, otp };
            }`;
content = content.replace(handleVerifyOtpOld, handleVerifyOtpNew);

// 4. Update handleVerifyOtp (res.ok success logic)
const handleVerifySuccessOld = `if (otpContext === 'Reset') {
                    const data = await res.json();
                    setResetToken(data.token);
                    openModal('new-password-modal');
                } else {
                    const emailId = otpContext === 'Student' ? 'student-email' : 'teacher-email';
                    const emailValue = document.getElementById(emailId)?.value;`;

const handleVerifySuccessNew = `if (otpContext === 'Reset') {
                    const data = await res.json();
                    setResetToken(data.token);
                    openModal('new-password-modal');
                } else if (otpContext === 'AdminControls') {
                    const emailValue = document.getElementById('admin-current-email')?.value;
                    if (emailValue) setVerifiedEmails(prev => ({ ...prev, [emailValue]: true }));
                    setFormErrors(prev => { const newE = {...prev}; delete newE['admin-current-email']; return newE; });
                    openModal('admin-controls-modal');
                } else {
                    const emailId = otpContext === 'Student' ? 'student-email' : 'teacher-email';
                    const emailValue = document.getElementById(emailId)?.value;`;
content = content.replace(handleVerifySuccessOld, handleVerifySuccessNew);

// 5. Update otp-modal back button
const otpBackOld = `if (otpContext === 'Student') openModal('register-student-modal');
            else if (otpContext === 'Teacher') openModal('register-teacher-modal');
            else openModal('forgot-password-modal');`;
const otpBackNew = `if (otpContext === 'Student') openModal('register-student-modal');
            else if (otpContext === 'Teacher') openModal('register-teacher-modal');
            else if (otpContext === 'AdminControls') openModal('admin-controls-modal');
            else openModal('forgot-password-modal');`;
content = content.replace(otpBackOld, otpBackNew);

// 6. Update otp-modal resend logic
const resendOld = `if (otpContext === 'Reset') sendForgotOtp();
                        else sendOtp(otpContext === 'Student' ? 'student-email' : 'teacher-email', otpContext);`;
const resendNew = `if (otpContext === 'Reset') sendForgotOtp();
                        else if (otpContext === 'AdminControls') sendOtp('admin-current-email', 'AdminControls');
                        else sendOtp(otpContext === 'Student' ? 'student-email' : 'teacher-email', otpContext);`;
content = content.replace(resendOld, resendNew);

// 7. Inject AdminControlsModal at the very end properly
const adminModalHtml = `
{/* ADMIN CONTROLS MODAL POPUP */}
<div id="admin-controls-modal" className={\`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-all duration-300 \${activeModal === 'admin-controls-modal' ? 'opacity-100 backdrop-blur-md bg-slate-900/40' : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'}\`}>
    <div className={\`relative w-full max-w-4xl bg-white rounded-[24px] shadow-level-3 p-8 md:p-12 border border-slate-100 overflow-hidden transition-all duration-300 transform \${activeModal === 'admin-controls-modal' ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}\`}>
        
        {/* Close Button */}
        <button onClick={closeModal} className="absolute top-6 right-6 text-slate-500 hover:text-red-500 transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Left Column: Branding */}
            <div className="flex flex-col items-center text-center md:border-r border-slate-100 md:pr-8">
                <div className="w-32 h-32 mb-6 rounded-full overflow-hidden bg-blue-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600 text-[64px]">manage_accounts</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-3">Admin Controls</h2>
                <p className="text-sm text-slate-500 max-w-xs font-medium">Update your administrator email address or reset your password securely.</p>
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
                            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
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
                        <label className="block text-sm font-bold text-slate-700 mb-1">Current Email Address</label>
                        <div className="flex gap-2">
                            <input id="admin-current-email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type="email" placeholder="current@a1academy.com" required onChange={() => setFormErrors({...formErrors, 'admin-current-email': null})} />
                            {(() => {
                                const emailVal = document.getElementById('admin-current-email')?.value || '';
                                const isVerified = verifiedEmails[emailVal] && emailVal !== '';
                                return isVerified ? (
                                    <div className="shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-4 py-2.5 rounded-lg w-[116px] flex items-center justify-center gap-1">
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
                                        const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/me', { headers: { 'Authorization': \`Bearer \${token}\` }});
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
                                    }} className="shrink-0 bg-amber-300 text-slate-900 font-bold px-4 py-2.5 rounded-lg hover:bg-amber-400 transition-all shadow-sm cursor-pointer w-[116px] flex items-center justify-center gap-1 disabled:opacity-70 ">
                                        {isSendingOtp ? (
                                            <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Sending...</>
                                        ) : (
                                            'Verify'
                                        )}
                                    </button>
                                );
                            })()}
                        </div>
                        {formErrors['admin-current-email'] && <p className="text-sm font-bold text-red-500 mt-1">{formErrors['admin-current-email']}</p>}
                    </div>

                    {/* New Email */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">New Email Address <span className="text-slate-400 font-normal">(Optional)</span></label>
                        <input id="admin-new-email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type="email" placeholder="new@a1academy.com" />
                    </div>

                    {/* Passwords */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">New Password</label>
                            <input id="admin-new-password" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type="password" placeholder="••••••••" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Confirm Password</label>
                            <input id="admin-confirm-password" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type="password" placeholder="••••••••" onChange={() => { if(formErrors['admin-confirm-password']) setFormErrors({...formErrors, 'admin-confirm-password': null}); }}/>
                            {formErrors['admin-confirm-password'] && <p className="text-sm font-bold text-red-500 mt-1">{formErrors['admin-confirm-password']}</p>}
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 text-white font-bold text-sm px-4 py-3.5 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md flex justify-center items-center gap-2 mt-4">
                        <span className="material-symbols-outlined text-[20px]">shield_person</span> Update Credentials
                    </button>
                    <p className="text-xs text-center text-slate-500 font-medium mt-2">You will need to verify these changes via OTP.</p>
                </form>
            </div>
        </div>
    </div>
</div>
`;

content = content.replace(/\s*<\/>\s*\);\s*\}\s*$/, '\n' + adminModalHtml + '\n        </>\n    );\n}\n');

fs.writeFileSync(authModalsPath, content, 'utf8');
console.log('AuthModals safely injected successfully.');
