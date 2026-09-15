const fs = require('fs');
const path = require('path');

const authModalsPath = path.join(__dirname, 'src', 'components', 'AuthModals.jsx');
let content = fs.readFileSync(authModalsPath, 'utf8');

// 1. Update sendOtp to use emailId
content = content.replace(
    'setIsSendingOtp(true);\n        setOtpError(\'\');',
    'setIsSendingOtp(emailId);\n        setOtpError(\'\');'
);

content = content.replace(
    'setIsSendingOtp(true);\n        \n        try {\n            const res = await fetch(import.meta.env.VITE_API_URL + \'/api/auth/forgot-password\'',
    'setIsSendingOtp(\'forgot\');\n        \n        try {\n            const res = await fetch(import.meta.env.VITE_API_URL + \'/api/auth/forgot-password\''
);

// 2. Fix student verify button
content = content.replace(
    '<button type="button" id="student-verify-btn" disabled={isSendingOtp} onClick={() => sendOtp(\'student-email\', \'Student\')} className="shrink-0 bg-amber-300 text-slate-900 font-bold px-4 py-2.5 rounded-lg hover:bg-amber-400 transition-all shadow-sm cursor-pointer w-[116px] flex items-center justify-center gap-1 disabled:opacity-70 ">\n                                        {isSendingOtp ? (',
    '<button type="button" id="student-verify-btn" disabled={isSendingOtp} onClick={() => sendOtp(\'student-email\', \'Student\')} className="shrink-0 bg-amber-300 text-slate-900 font-bold px-4 py-2.5 rounded-lg hover:bg-amber-400 transition-all shadow-sm cursor-pointer w-[116px] flex items-center justify-center gap-1 disabled:opacity-70 ">\n                                        {isSendingOtp === \'student-email\' ? ('
);

// 3. Fix teacher verify button
content = content.replace(
    '<button type="button" id="teacher-verify-btn" disabled={isSendingOtp} onClick={() => sendOtp(\'teacher-email\', \'Teacher\')} className="shrink-0 bg-amber-300 text-slate-900 font-bold px-4 py-2.5 rounded-lg hover:bg-amber-400 transition-all shadow-sm cursor-pointer w-[116px] flex items-center justify-center gap-1 disabled:opacity-70 ">\n                                        {isSendingOtp ? (',
    '<button type="button" id="teacher-verify-btn" disabled={isSendingOtp} onClick={() => sendOtp(\'teacher-email\', \'Teacher\')} className="shrink-0 bg-amber-300 text-slate-900 font-bold px-4 py-2.5 rounded-lg hover:bg-amber-400 transition-all shadow-sm cursor-pointer w-[116px] flex items-center justify-center gap-1 disabled:opacity-70 ">\n                                        {isSendingOtp === \'teacher-email\' ? ('
);

// 4. Fix forgot password button
content = content.replace(
    '<button onClick={sendForgotOtp} disabled={isSendingOtp} className="w-full bg-slate-900 text-white font-bold py-3 rounded-full text-base hover:bg-slate-800 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100">\n            {isSendingOtp ? (',
    '<button onClick={sendForgotOtp} disabled={isSendingOtp} className="w-full bg-slate-900 text-white font-bold py-3 rounded-full text-base hover:bg-slate-800 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100">\n            {isSendingOtp === \'forgot\' ? ('
);

// 5. Fix admin current email button
content = content.replace(
    /disabled=\{isSendingOtp\} onClick=\{async \(\) => \{\s*const email = document\.getElementById\('admin-current-email'\)\?\.value;/,
    "disabled={isSendingOtp} onClick={async () => {\n                                        const email = document.getElementById('admin-current-email')?.value;"
);
content = content.replace(
    /className="shrink-0 bg-amber-300 text-slate-900 font-bold px-4 py-2\.5 rounded-lg hover:bg-amber-400 transition-all shadow-sm cursor-pointer w-\[116px\] flex items-center justify-center gap-1 disabled:opacity-70 ">\s*\{isSendingOtp \? \(/,
    'className="shrink-0 bg-amber-300 text-slate-900 font-bold px-4 py-2.5 rounded-lg hover:bg-amber-400 transition-all shadow-sm cursor-pointer w-[116px] flex items-center justify-center gap-1 disabled:opacity-70 ">\n                                        {isSendingOtp === \'admin-current-email\' ? ('
);

// 6. Fix admin new email button
content = content.replace(
    /disabled=\{isSendingOtp\} onClick=\{async \(\) => \{\s*const email = document\.getElementById\('admin-new-email'\)\?\.value;/,
    "disabled={isSendingOtp} onClick={async () => {\n                                        const email = document.getElementById('admin-new-email')?.value;"
);
content = content.replace(
    /className="shrink-0 bg-amber-300 text-slate-900 font-bold px-4 py-2\.5 rounded-lg hover:bg-amber-400 transition-all shadow-sm cursor-pointer w-\[116px\] flex items-center justify-center gap-1 disabled:opacity-70 ">\s*\{isSendingOtp \? \(/,
    'className="shrink-0 bg-amber-300 text-slate-900 font-bold px-4 py-2.5 rounded-lg hover:bg-amber-400 transition-all shadow-sm cursor-pointer w-[116px] flex items-center justify-center gap-1 disabled:opacity-70 ">\n                                        {isSendingOtp === \'admin-new-email\' ? ('
);

fs.writeFileSync(authModalsPath, content, 'utf8');
console.log('Fixed spinning buttons successfully.');
