import React from 'react';

export default function RegisterTeacherModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
<div id="register-teacher-modal" className="fixed inset-0 z-[110] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div className="relative w-full max-w-5xl min-h-[700px] flex flex-col justify-center bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 md:p-12 border border-surface-variant overflow-hidden">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
            <span className="material-symbols-outlined text-[32px]">close</span>
        </button>

        {/* Two-Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            
            {/* Left Column: Branding & Intro */}
            <div className="flex flex-col items-center text-center md:border-r border-surface-variant md:pr-8">
                <div className="w-32 h-32 mb-6 rounded-full overflow-hidden bg-secondary-fixed/40 flex items-center justify-center">
                    <img src="https://cdn-icons-png.flaticon.com/512/3429/3429433.png" alt="Cartoon Teacher Avatar" className="w-24 h-24 object-contain drop-shadow-md hover:scale-110 transition-transform duration-300"/>
                </div>
                <h2 className="font-headline-md text-headline-md text-primary mb-3">Teacher Application</h2>
                <p className="text-body-md text-on-surface-variant max-w-xs mb-4">Join our community of expert educators. Provide your details and credentials below.</p>
                <div className="bg-surface-container-low p-4 rounded-lg border border-surface-dim">
                    <p className="text-label-md font-label-md text-primary flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">info</span>
                        Pending Review Process
                    </p>
                    <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">To ensure scholarly excellence, all new teacher accounts are placed in a <strong>Pending status</strong>. Scheduling tools will unlock once an Administrator verifies your qualifications.</p>
                </div>
            </div>

            {/* Right Column: The Form */}
            <div>
                <form className="space-y-4" action="#" method="POST">
                    
                    {/* Side-by-Side Names Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* First Name */}
                        <div>
                            <label className="block font-label-md text-on-surface mb-1" htmlFor="teacher-firstname">First Name</label>
                            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="teacher-firstname" placeholder="First name" required />
                            <p id="teacher-firstname-error" className="text-xs text-error font-bold hidden mt-1">Please provide your First Name.</p>
                        </div>

                        {/* Last Name (Optional) */}
                        <div>
                            <label className="block font-label-md text-on-surface mb-1" htmlFor="teacher-lastname">Last Name <span className="text-outline font-normal">(Optional)</span></label>
                            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="teacher-lastname" placeholder="Last name" />
                        </div>
                    </div>

                    {/* Email with Verify Button */}
                    <div>
                        <label className="block font-label-md text-on-surface mb-1" htmlFor="teacher-email">Email Address</label>
                        <div className="flex gap-2">
                            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="email" id="teacher-email" placeholder="teacher@example.com" required />
                            <button type="button" id="teacher-verify-btn" onClick={() => {}} className="shrink-0 bg-surface-container-high text-on-surface font-label-md px-4 py-2.5 rounded-lg hover:bg-surface-dim transition-all border border-outline-variant cursor-pointer">Verify</button>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-outline">* Must be a unique email address.</p>
                            {/* Hidden Verified Text */}
                            <p id="teacher-verified-text" className="text-xs text-green-600 font-bold hidden flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span> Verified!
                            </p>
                        </div>
                        <p id="teacher-email-error" className="text-xs text-error font-bold hidden mt-1">Please enter a valid email address.</p>
                    </div>

                    {/* Professional Qualifications with Yellow Upload Button */}
                    <div>
                        <label className="block font-label-md text-on-surface mb-1" htmlFor="teacher-qualifications">Professional Qualifications</label>
                        <div className="flex gap-2">
                            <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="teacher-qualifications" placeholder="e.g. BSc. Mathematics" required />
                            {/* Yellow Upload Button */}
                            <input type="file" id="teacher-qual-file" className="hidden"  />
                            <button type="button" id="teacher-upload-btn" onClick={() => {}} className="shrink-0 bg-secondary-container text-on-secondary-container font-label-md px-4 py-2.5 rounded-lg hover:bg-secondary-fixed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm w-[116px]">
                                <span className="material-symbols-outlined text-[18px]" id="teacher-upload-icon">upload_file</span> 
                                <span id="teacher-upload-text">Upload</span>
                            </button>
                        </div>
                        <p id="teacher-qualifications-error" className="text-xs text-error font-bold hidden mt-1">Please provide your professional qualifications.</p>
                        <p className="text-xs text-outline mt-1">* Required for administrative verification. Please upload certificates.</p>
                    </div>

                    {/* Password with Toggle (Stacked) */}
                    <div>
                        <label className="block font-label-md text-on-surface mb-1" htmlFor="teacher-password">Password</label>
                        <div className="relative">
                            <input className="w-full bg-surface border border-outline-variant rounded-lg pl-4 pr-10 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="password" id="teacher-password" placeholder="••••••••" required />
                            <button type="button" onClick={() => {}} className="absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-primary transition-colors outline-none cursor-pointer">
                                <span id="teacher-eye-icon-1" className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                        </div>
                        <p className="text-xs text-outline mt-1">* Will be securely hashed.</p>
                    </div>

                    {/* Confirm Password with Toggle (Stacked) */}
                    <div>
                        <label className="block font-label-md text-on-surface mb-1" htmlFor="teacher-confirm-password">Confirm Password</label>
                        <div className="relative">
                            <input className="w-full bg-surface border border-outline-variant rounded-lg pl-4 pr-10 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="password" id="teacher-confirm-password" placeholder="••••••••" required  />
                            <button type="button" onClick={() => {}} className="absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-primary transition-colors outline-none cursor-pointer">
                                <span id="teacher-eye-icon-2" className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                        </div>
                        <p id="teacher-password-error" className="text-xs text-error font-bold hidden mt-1">Passwords do not match.</p>
                    </div>

                    {/* Submit Button */}
                    <button className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm mt-4 cursor-pointer" type="submit" onClick={() => {}}>
                        Submit Teacher Application
                    </button>
                </form>

                <div className="text-center mt-4">
                    <p className="text-body-sm text-on-surface-variant">Already an approved teacher? <a href="#" onClick={onClose} className="text-primary font-bold hover:underline">Sign In</a></p>
                </div>
            </div>

        </div>
    </div>
</div>
    );
}

