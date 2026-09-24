import React, { useState, useEffect } from 'react';

export default function AdminControlModal({ isOpen, onClose }) {
    const [step, setStep] = useState('update'); // 'update' | 'otp'
    const [currentEmailVerified, setCurrentEmailVerified] = useState(false);
    const [newEmailVerified, setNewEmailVerified] = useState(false);

    // Handle resetting state on close
    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setStep('update');
                setCurrentEmailVerified(false);
                setNewEmailVerified(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setStep('otp');
    };

    const handleCompleteVerification = () => {
        alert("Admin credentials updated successfully!");
        onClose();
    };

    return (
        <div 
            className={`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100 pointer-events-auto backdrop-blur-md bg-slate-900/40' : 'opacity-0 pointer-events-none bg-transparent backdrop-blur-none'}`}
        >
            
            {/* Admin Control Container */}
            <div 
                className={`relative w-full max-w-5xl bg-white dark:bg-slate-800 rounded-[24px] shadow-2xl p-8 md:p-12 border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-400 ease-out ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}
            >
                
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer outline-none z-10">
                    <span className="material-symbols-outlined text-[32px]">close</span>
                </button>

                {/* STEP 1: Update Details */}
                {step === 'update' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center animate-in fade-in">
                        {/* Left Column: Branding */}
                        <div className="flex flex-col items-center text-center md:border-r border-slate-100 dark:border-slate-700 md:pr-8">
                            <div className="w-32 h-32 mb-6 rounded-full overflow-hidden bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[64px]">manage_accounts</span>
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Admin Controls</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs font-medium">Update your administrator email address or reset your password securely.</p>
                        </div>

                        {/* Right Column: The Form */}
                        <div>
                            <form className="space-y-4" onSubmit={handleSubmit}>
                                
                                {/* Current Email (with Verify Button) */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Current Email Address</label>
                                    <div className="flex gap-2">
                                        <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" type="email" placeholder="current@a1academy.com" required />
                                        <button type="button" onClick={() => setCurrentEmailVerified(true)} className="shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-4 py-3 rounded-xl hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer">
                                            Verify
                                        </button>
                                    </div>
                                    <div className="flex justify-end items-center mt-1 h-5">
                                        {currentEmailVerified && (
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                                                <span className="material-symbols-outlined text-[14px]">check_circle</span> Verified!
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* New Email (with Verify Button) */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">New Email Address</label>
                                    <div className="flex gap-2">
                                        <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" type="email" placeholder="new@a1academy.com" />
                                        <button type="button" onClick={() => setNewEmailVerified(true)} className="shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-4 py-3 rounded-xl hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer">
                                            Verify
                                        </button>
                                    </div>
                                    <div className="flex flex-col mt-1 h-5">
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mb-1">If not change the email Just leave this blank</p>
                                        <div className="flex justify-end items-center -mt-4">
                                            {newEmailVerified && (
                                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                                                    <span className="material-symbols-outlined text-[14px]">check_circle</span> Verified!
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Passwords */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">New Password</label>
                                        <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" type="password" placeholder="••••••••" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Confirm Password</label>
                                        <input className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" type="password" placeholder="••••••••" />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button type="submit" className="w-full bg-blue-600 text-white font-bold text-sm px-4 py-3.5 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md flex justify-center items-center gap-2 cursor-pointer">
                                        <span className="material-symbols-outlined text-[20px]">security</span>
                                        Update Credentials
                                    </button>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-3">
                                        You will need to verify these changes via OTP.
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* STEP 2: OTP Verification */}
                {step === 'otp' && (
                    <div className="flex flex-col items-center justify-center py-8 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[40px] text-blue-600 dark:text-blue-400">mark_email_read</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Check your email</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 text-center max-w-sm">We sent a 5-digit verification code to confirm your new credentials.</p>
                        
                        <div className="flex justify-center gap-3 mb-8">
                            {[1, 2, 3, 4, 5].map((_, i) => (
                                <input 
                                    key={i} 
                                    type="text" 
                                    maxLength="1" 
                                    className="w-14 h-16 text-center text-2xl font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" 
                                />
                            ))}
                        </div>

                        <div className="w-full max-w-sm">
                            <button onClick={handleCompleteVerification} className="w-full bg-blue-600 text-white font-bold text-sm px-4 py-3.5 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md flex justify-center items-center gap-2 cursor-pointer">
                                Verify Code
                            </button>
                            <div className="mt-6 text-center">
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">
                                    Didn't receive it? Resend in <span className="font-bold text-slate-900 dark:text-white">60</span>s
                                </p>
                                <button className="text-sm text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer bg-transparent border-none p-0">
                                    Resend Code
                                </button>
                            </div>
                            <button onClick={() => setStep('update')} className="mt-6 w-full text-center text-sm font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer bg-transparent border-none p-0">
                                ← Back to form
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
