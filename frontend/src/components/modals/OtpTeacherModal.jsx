import React from 'react';

export default function OtpTeacherModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
<div id="otp-teacher-modal" className="fixed inset-0 z-[130] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div className="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <!-- Close Button (Returns to Registration) -->
        <button onClick={onClose} className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none">
            <span className="material-symbols-outlined text-[28px]">close</span>
        </button>

        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary-fixed/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-primary">mark_email_read</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-primary mb-2">Check your email</h2>
        <p className="text-body-md text-on-surface-variant mb-6">We sent a 5-digit verification code to your email address.</p>
        
        <div className="flex justify-center gap-3 mb-8">
            <input type="text" maxlength="1" className="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            <input type="text" maxlength="1" className="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            <input type="text" maxlength="1" className="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            <input type="text" maxlength="1" className="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            <input type="text" maxlength="1" className="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
        </div>

        <button id="otp-teacher-verify-btn" onClick={() => {}} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer flex justify-center items-center">Verify Code</button>
        <div className="mt-6 text-center">
            <p id="otp-teacher-resend-text" className="text-body-sm text-on-surface-variant">Didn't receive it? Resend in <span id="otp-teacher-timer" className="font-bold">60</span>s</p>
            <a href="#" id="otp-teacher-resend-link" onClick={() => {}} className="text-body-sm text-primary font-bold hover:underline">Resend Code</a>
        </div>
    </div>
</div>
    );
}
