import React from 'react';

export default function NewPasswordModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
<div id="new-password-modal" className="fixed inset-0 z-[150] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div className="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
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

        <button onClick={() => {}} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer">Save New Password</button>
    </div>
</div>
    );
}
