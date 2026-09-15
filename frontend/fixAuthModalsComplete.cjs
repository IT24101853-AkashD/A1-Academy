const fs = require('fs');
const path = require('path');

const authModalsPath = path.join(__dirname, 'src', 'components', 'AuthModals.jsx');
let content = fs.readFileSync(authModalsPath, 'utf8');

// 1. handleVerifyOtp bodyData
const verifyBodyRegex = /if \(otpContext === 'Reset'\) \{\s*endpoint = import\.meta\.env\.VITE_API_URL \+ '\/api\/auth\/verify-reset-otp';\s*bodyData = \{ email: document\.getElementById\('forgot-email'\)\?\.value, otp \};\s*\} else \{\s*const emailId = otpContext === 'Student' \? 'student-email' : 'teacher-email';\s*bodyData = \{ email: document\.getElementById\(emailId\)\?\.value, otp \};\s*\}/;
const verifyBodyNew = `if (otpContext === 'Reset') {
                endpoint = import.meta.env.VITE_API_URL + '/api/auth/verify-reset-otp';
                bodyData = { email: document.getElementById('forgot-email')?.value, otp };
            } else if (otpContext === 'AdminControls') {
                bodyData = { email: document.getElementById('admin-current-email')?.value, otp };
            } else if (otpContext === 'AdminControlsNewEmail') {
                bodyData = { email: document.getElementById('admin-new-email')?.value, otp };
            } else {
                const emailId = otpContext === 'Student' ? 'student-email' : 'teacher-email';
                bodyData = { email: document.getElementById(emailId)?.value, otp };
            }`;

if (verifyBodyRegex.test(content)) {
    content = content.replace(verifyBodyRegex, verifyBodyNew);
} else {
    console.log("Regex for verify body failed!");
}

// 2. handleVerifyOtp success logic
const verifySuccessRegex = /if \(otpContext === 'Reset'\) \{\s*const data = await res\.json\(\);\s*setResetToken\(data\.token\);\s*openModal\('new-password-modal'\);\s*\} else \{\s*const emailId = otpContext === 'Student' \? 'student-email' : 'teacher-email';\s*const emailValue = document\.getElementById\(emailId\)\?\.value;\s*if \(emailValue\) \{\s*setVerifiedEmails\(prev => \(\{ \.\.\.prev, \[emailValue\]: true \}\)\);\s*\}\s*setFormErrors\(prev => \{ \s*const newErrors = \{ \.\.\.prev \}; \s*delete newErrors\[emailId\]; \s*return newErrors; \s*\}\);\s*openModal\(otpContext === 'Student' \? 'register-student-modal' : 'register-teacher-modal'\);\s*\}/;
const verifySuccessNew = `if (otpContext === 'Reset') {
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
                }`;

if (verifySuccessRegex.test(content)) {
    content = content.replace(verifySuccessRegex, verifySuccessNew);
} else {
    console.log("Regex for verify success failed!");
}

// 3. otp-modal back button
const otpBackRegex = /if \(otpContext === 'Student'\) openModal\('register-student-modal'\);\s*else if \(otpContext === 'Teacher'\) openModal\('register-teacher-modal'\);\s*else openModal\('forgot-password-modal'\);/;
const otpBackNew = `if (otpContext === 'Student') openModal('register-student-modal');
            else if (otpContext === 'Teacher') openModal('register-teacher-modal');
            else if (otpContext.startsWith('AdminControls')) openModal('admin-controls-modal');
            else openModal('forgot-password-modal');`;
if (otpBackRegex.test(content)) {
    content = content.replace(otpBackRegex, otpBackNew);
} else {
    console.log("Regex for otp back failed!");
}

// 4. otp-modal resend logic
const otpResendRegex = /if \(otpContext === 'Reset'\) sendForgotOtp\(\);\s*else sendOtp\(otpContext === 'Student' \? 'student-email' : 'teacher-email', otpContext\);/g;
const otpResendNew = `if (otpContext === 'Reset') sendForgotOtp();
                        else if (otpContext.startsWith('AdminControls')) sendOtp(otpContext === 'AdminControls' ? 'admin-current-email' : 'admin-new-email', otpContext);
                        else sendOtp(otpContext === 'Student' ? 'student-email' : 'teacher-email', otpContext);`;
if (otpResendRegex.test(content)) {
    content = content.replace(otpResendRegex, otpResendNew);
} else {
    console.log("Regex for otp resend failed!");
}

fs.writeFileSync(authModalsPath, content, 'utf8');
console.log('Fixed AuthModals remaining logic.');
