import React from 'react';

export default function ForgotPasswordModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
<div id="forgot-password-modal" className="fixed inset-0 z-[130] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div className="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <button onClick={onClose} className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-fixed/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-primary">lock_reset</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-primary mb-2">Reset Password</h2>
        <p className="text-body-md text-on-surface-variant mb-6">Enter the email address associated with your account, and we'll send you a code to reset your password.</p>
        <div className="text-left mb-6">
            <label className="block font-label-md text-on-surface mb-1" htmlFor="forgot-email">Email Address</label>
            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="email" id="forgot-email" placeholder="e.g. hello@example.com" required />
            <p id="forgot-email-error" className="text-xs text-error font-bold hidden mt-1">Please enter a valid email address.</p>
        </div>
        <button onClick={() => {}} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer">Send Reset Code</button>
    </div>
</div>
    );
}
