const fs = require('fs');
const path = require('path');

const authModalsPath = path.join(__dirname, 'src', 'components', 'AuthModals.jsx');
let content = fs.readFileSync(authModalsPath, 'utf8');

// 1. Update timers to include 'AdminControlsNewEmail'
content = content.replace(
    "const [timers, setTimers] = useState({ 'Student': 0, 'Teacher': 0, 'Reset': 0, 'AdminControls': 0 });",
    "const [timers, setTimers] = useState({ 'Student': 0, 'Teacher': 0, 'Reset': 0, 'AdminControls': 0, 'AdminControlsNewEmail': 0 });"
);

// 2. Update sendOtp firstName check
content = content.replace(
    "const firstName = role === 'AdminControls' ? 'Admin' : document.getElementById(firstNameId)?.value;",
    "const firstName = role.startsWith('AdminControls') ? 'Admin' : document.getElementById(firstNameId)?.value;"
);
content = content.replace(
    "if (!firstName && role !== 'AdminControls') {",
    "if (!firstName && !role.startsWith('AdminControls')) {"
);

// 3. Update handleVerifyOtp bodyData
content = content.replace(
    "} else if (otpContext === 'AdminControls') {\n                bodyData = { email: document.getElementById('admin-current-email')?.value, otp };\n            }",
    "} else if (otpContext === 'AdminControls') {\n                bodyData = { email: document.getElementById('admin-current-email')?.value, otp };\n            } else if (otpContext === 'AdminControlsNewEmail') {\n                bodyData = { email: document.getElementById('admin-new-email')?.value, otp };\n            }"
);

// 4. Update handleVerifySuccess (res.ok block)
const handleVerifySuccessOld = `} else if (otpContext === 'AdminControls') {\n                    const emailValue = document.getElementById('admin-current-email')?.value;\n                    if (emailValue) setVerifiedEmails(prev => ({ ...prev, [emailValue]: true }));\n                    setFormErrors(prev => { const newE = {...prev}; delete newE['admin-current-email']; return newE; });\n                    openModal('admin-controls-modal');\n                }`;
const handleVerifySuccessNew = `} else if (otpContext === 'AdminControls' || otpContext === 'AdminControlsNewEmail') {\n                    const emailId = otpContext === 'AdminControls' ? 'admin-current-email' : 'admin-new-email';\n                    const emailValue = document.getElementById(emailId)?.value;\n                    if (emailValue) setVerifiedEmails(prev => ({ ...prev, [emailValue]: true }));\n                    setFormErrors(prev => { const newE = {...prev}; delete newE[emailId]; return newE; });\n                    openModal('admin-controls-modal');\n                }`;
content = content.replace(handleVerifySuccessOld, handleVerifySuccessNew);

// 5. Update otp-modal back button
content = content.replace(
    "else if (otpContext === 'AdminControls') openModal('admin-controls-modal');",
    "else if (otpContext === 'AdminControls' || otpContext === 'AdminControlsNewEmail') openModal('admin-controls-modal');"
);

// 6. Update otp-modal resend logic
content = content.replace(
    "else if (otpContext === 'AdminControls') sendOtp('admin-current-email', 'AdminControls');",
    "else if (otpContext === 'AdminControls' || otpContext === 'AdminControlsNewEmail') sendOtp(otpContext === 'AdminControls' ? 'admin-current-email' : 'admin-new-email', otpContext);"
);

// 7. Update form submission validation to require verified newEmail if provided
content = content.replace(
    "const newEmail = document.getElementById('admin-new-email')?.value;",
    "const newEmail = document.getElementById('admin-new-email')?.value;\n                    if (newEmail && !verifiedEmails[newEmail]) {\n                        setFormErrors(prev => ({...prev, 'admin-new-email': 'Please verify your new email.'}));\n                        return;\n                    }"
);

// 8. Replace New Email input with verified input layout
const newEmailOldHtml = `<div>\n                        <label className="block text-sm font-bold text-slate-700 mb-1">New Email Address <span className="text-slate-400 font-normal">(Optional)</span></label>\n                        <input id="admin-new-email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type="email" placeholder="new@a1academy.com" />\n                    </div>`;

const newEmailNewHtml = `<div>\n                        <label className="block text-sm font-bold text-slate-700 mb-1">New Email Address <span className="text-slate-400 font-normal">(Optional)</span></label>\n                        <div className="flex gap-2">\n                            <input id="admin-new-email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" type="email" placeholder="new@a1academy.com" onChange={() => setFormErrors({...formErrors, 'admin-new-email': null})} />\n                            {(() => {\n                                const emailVal = document.getElementById('admin-new-email')?.value || '';\n                                const isVerified = verifiedEmails[emailVal] && emailVal !== '';\n                                return isVerified ? (\n                                    <div className="shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-4 py-2.5 rounded-lg w-[116px] flex items-center justify-center gap-1">\n                                        <span className="material-symbols-outlined text-[18px]">check_circle</span> Verified\n                                    </div>\n                                ) : (\n                                    <button type="button" disabled={isSendingOtp} onClick={async () => {\n                                        const email = document.getElementById('admin-new-email')?.value;\n                                        if (!email) {\n                                            setFormErrors({...formErrors, 'admin-new-email': 'Please enter a new email to verify.'});\n                                            return;\n                                        }\n                                        sendOtp('admin-new-email', 'AdminControlsNewEmail');\n                                    }} className="shrink-0 bg-amber-300 text-slate-900 font-bold px-4 py-2.5 rounded-lg hover:bg-amber-400 transition-all shadow-sm cursor-pointer w-[116px] flex items-center justify-center gap-1 disabled:opacity-70 ">\n                                        {isSendingOtp ? (\n                                            <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Sending...</>\n                                        ) : (\n                                            'Verify'\n                                        )}\n                                    </button>\n                                );\n                            })()}\n                        </div>\n                        {formErrors['admin-new-email'] && <p className="text-sm font-bold text-red-500 mt-1">{formErrors['admin-new-email']}</p>}\n                    </div>`;

content = content.replace(newEmailOldHtml, newEmailNewHtml);

fs.writeFileSync(authModalsPath, content, 'utf8');
console.log('Successfully updated New Email verification logic.');
