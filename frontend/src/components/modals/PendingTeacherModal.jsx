import React from 'react';

export default function PendingTeacherModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
<div id="pending-teacher-modal" className="fixed inset-0 z-[140] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div className="relative w-full max-w-sm bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-secondary-container flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[48px] text-on-secondary-container animate-pulse">hourglass_top</span>
        </div>
        <h2 className="font-display-sm text-[28px] font-bold text-primary mb-2">Application Submitted!</h2>
        <p className="text-body-md text-on-surface-variant mb-8">Your credentials have been sent to our Administrators for verification. Once approved, you will receive an email notification and can log in to access your dashboard.</p>
        
        <button onClick={onClose} className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer">Got it!</button>
    </div>
</div>
    );
}
