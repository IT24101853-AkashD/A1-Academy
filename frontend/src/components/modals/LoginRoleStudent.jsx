import React from 'react';

export default function LoginRoleStudent({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
<div className="text-center mb-10">
            <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg font-bold text-primary mb-4">Welcome Back!</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Select your role to log in to your account.</p>
        </div>

        <!-- Two-Column Grid Layout -->
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            
            <!-- Left Column: Branding & Role Toggles -->
            <div className="flex flex-col items-center justify-center text-center md:border-r border-surface-variant md:pr-8">
                <div className="w-32 h-32 mb-8 rounded-full overflow-hidden flex items-center justify-center">
                    <img src="https://cdn-icons-png.flaticon.com/512/3135/3135810.png" id="login-avatar" alt="Login Avatar" className="w-24 h-24 object-contain drop-shadow-md transition-transform duration-300"/>
                </div>

                <!-- Role Selection Toggles -->
                <div className="grid grid-cols-2 gap-4 w-full">
                    <!-- Student Box (Default Active) -->
                    <div id="login-role-student" onClick={() => {}} className="border-2 border-primary bg-primary-fixed/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300">
                        <span className="font-label-md text-primary font-bold">Student</span>
                    </div>

                    <!-- Teacher Box -->
                    <div id="login-role-teacher" onClick={() => {}} className="border-2 border-surface-variant bg-surface hover:border-outline-variant rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300">
                        <span className="font-label-md text-on-surface-variant">Teacher</span>
                    </div>
                </div>
            </div>

            <!-- Right Column: The Login Form -->
            <div>
                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                    
                    <!-- Email -->
                    <div>
                        <label className="block font-label-md text-on-surface mb-1" htmlFor="login-email">Email Address</label>
                        <input className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="email" id="login-email" placeholder="Enter your email" required />
                    </div>

                    <!-- Password with Toggle & Forgot Link -->
                    <div>
                        <label className="block font-label-md text-on-surface mb-1" htmlFor="login-password">Password</label>
                        <div className="relative">
                            <input className="w-full bg-surface border border-outline-variant rounded-lg pl-4 pr-10 py-3 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="password" id="login-password" placeholder="••••••••" required />
                            <button type="button" onClick={() => {}} className="absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-primary transition-colors outline-none cursor-pointer">
                                <span id="login-eye-icon" className="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                        </div>
                        <!-- Forgot Password Link -->
                        <div className="flex justify-end mt-2">
                            <a href="#" onClick={() => {}} className="text-sm font-label-md text-primary hover:underline">Forgot password?</a>
                        </div>
                    </div>

                    <!-- Hidden Error Simulation Message -->
                    <p id="login-error" className="text-sm text-error font-medium bg-error-container p-3 rounded-lg border border-error/20 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">error</span>
                        Invalid email or password.
                    </p>

                    <!-- Submit Button -->
                    <button className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm mt-2 cursor-pointer" type="submit">
                        Log In
                    </button>
                    
                    <!-- Google Sign In Divider -->
                    <div className="relative mt-6 mb-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-surface-variant"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-surface-container-lowest text-outline text-xs">Or continue with</span>
                        </div>
                    </div>

                    <!-- Google Sign In Button -->
                    <button type="button" className="w-full flex items-center justify-center gap-3 bg-white border border-outline-variant rounded-full px-4 py-3 text-body-md font-label-md text-on-surface hover:bg-surface-container-low transition-all shadow-sm cursor-pointer">
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                        Sign in with Google
                    </button>
                </form>

                <!-- Registration Link -->
                <div className="text-center mt-8">
                    <p className="text-body-sm text-on-surface-variant">Don't have an account? <a href="#" onClick={onClose} className="text-primary font-bold hover:underline">Register here</a></p>
                </div>
            </div>

        </div>
    </div>
</div>
    );
}
