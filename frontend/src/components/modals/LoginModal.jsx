import React from 'react';

export default function LoginModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
<div id="login-modal" className="fixed inset-0 z-[120] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div className="relative w-full max-w-4xl bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 md:p-12 border border-surface-variant overflow-hidden">
        
        <!-- Close Button -->
        <button onClick={onClose} className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>
    );
}
