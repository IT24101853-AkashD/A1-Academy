
document.addEventListener("DOMContentLoaded", () => {
    const modalsContainer = document.createElement('div');
    modalsContainer.innerHTML = `
<!-- REGISTER MODAL POPUP -->
<div id="register-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div class="relative w-full max-w-4xl bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 md:p-12 overflow-hidden border border-surface-variant">
        
        <!-- Close Button -->
        <button onclick="document.getElementById('register-modal').classList.add('hidden')" class="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
            <span class="material-symbols-outlined text-[32px]">close</span>
        </button>

        <!-- Modal Header with Increased Font Size -->
        <div class="text-center mb-10">
            <h2 class="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg font-bold text-primary mb-4">Join A1 Academy</h2>
            <p class="font-body-lg text-body-lg text-on-surface-variant">Select your role to begin the registration process.</p>
        </div>

        <!-- Role Selection Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <!-- Student Card -->
            <div id="role-select-student" class="bg-white rounded-[16px] p-8 shadow-level-1 hover:shadow-level-2 transition-all duration-300 border-2 border-transparent hover:border-primary-fixed group flex flex-col items-center text-center cursor-pointer">
                <!-- Colorful Cartoon Student Image -->
                <div class="w-28 h-28 mb-6 rounded-full overflow-hidden bg-primary-fixed/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <img src="https://cdn-icons-png.flaticon.com/512/3135/3135810.png" alt="Cartoon Student Avatar" class="w-20 h-20 object-contain drop-shadow-md"/>
                </div>
                <h3 class="font-headline-sm text-[24px] text-primary mb-3">Register as a Student</h3>
                <p class="font-body-md text-body-md text-on-surface-variant">Browse courses, track your progress, and earn digital badges.</p>
            </div>

            <!-- Teacher Card -->
            <div id="role-select-teacher" class="bg-white rounded-[16px] p-8 shadow-level-1 hover:shadow-level-2 transition-all duration-300 border-2 border-transparent hover:border-primary-fixed group flex flex-col items-center text-center cursor-pointer">
                <!-- NEW Colorful Cartoon Teacher Image -->
                <div class="w-28 h-28 mb-6 rounded-full overflow-hidden bg-secondary-fixed/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <img src="https://cdn-icons-png.flaticon.com/512/3429/3429433.png" alt="Cartoon Teacher Avatar" class="w-20 h-20 object-contain drop-shadow-md"/>
                </div>
                <h3 class="font-headline-sm text-[24px] text-primary mb-3">Register as a Teacher</h3>
                <p class="font-body-md text-body-md text-on-surface-variant">Submit your qualifications, manage classes, and guide the next generation.</p>
            </div>

        </div>
    </div>
</div>


<!-- 2. NO-SCROLL STUDENT REGISTRATION FORM MODAL POPUP -->
<div id="register-student-modal" class="hidden fixed inset-0 z-[110] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div class="relative w-full max-w-5xl min-h-[700px] flex flex-col justify-center bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 md:p-12 border border-surface-variant overflow-hidden">
        
        <!-- Close Button -->
        <button onclick="document.getElementById('register-student-modal').classList.add('hidden')" class="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
            <span class="material-symbols-outlined text-[32px]">close</span>
        </button>

        <!-- Two-Column Grid Layout -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            
            <!-- Left Column: Branding & Intro -->
            <div class="flex flex-col items-center text-center md:border-r border-surface-variant md:pr-8">
                <div class="w-32 h-32 mb-6 rounded-full overflow-hidden bg-primary-fixed/40 flex items-center justify-center">
                    <img src="https://cdn-icons-png.flaticon.com/512/3135/3135810.png" alt="Cartoon Student Avatar" class="w-24 h-24 object-contain drop-shadow-md hover:scale-110 transition-transform duration-300"/>
                </div>
                <h2 class="font-headline-md text-headline-md text-primary mb-3">Student Registration</h2>
                <p class="text-body-md text-on-surface-variant max-w-xs">Create your Active account today to start browsing courses and earning your digital badges.</p>
            </div>

            <!-- Right Column: The Form -->
            <div>
                <form class="space-y-4" action="#" method="POST">
                    
                    <!-- Side-by-Side Names Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <!-- First Name -->
                        <div>
                            <label class="block font-label-md text-on-surface mb-1" for="firstname">First Name</label>
                            <input class="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="firstname" placeholder="First name" required />
                            <p id="firstname-error" class="text-xs text-error font-bold hidden mt-1">Please provide your First Name.</p>
                        </div>

                        <!-- Last Name (Optional) -->
                        <div>
                            <label class="block font-label-md text-on-surface mb-1" for="lastname">Last Name <span class="text-outline font-normal">(Optional)</span></label>
                            <input class="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="lastname" placeholder="Last name" />
                        </div>
                    </div>

                    <!-- Email with Verify Button -->
                    <div>
                        <label class="block font-label-md text-on-surface mb-1" for="email">Email Address</label>
                        <div class="flex gap-2">
                            <input class="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="email" id="email" placeholder="student@example.com" required />
                            <button type="button" id="verify-btn" onclick="openOtpStudent()" class="shrink-0 bg-surface-container-high text-on-surface font-label-md px-4 py-2.5 rounded-lg hover:bg-surface-dim transition-all border border-outline-variant cursor-pointer">Verify</button>
                        </div>
                        <div class="flex justify-between items-center mt-1">
                            <p class="text-xs text-outline">* Must be a unique email address.</p>
                            <!-- Hidden Verified Text -->
                            <p id="verified-text" class="text-xs text-green-600 font-bold hidden flex items-center gap-1">
                                <span class="material-symbols-outlined text-[14px]">check_circle</span> Verified!
                            </p>
                        </div>
                        <p id="email-error" class="text-xs text-error font-bold hidden mt-1">Please enter a valid email address.</p>
                    </div>

                    <!-- Password with Toggle (Stacked) -->
                    <div>
                        <label class="block font-label-md text-on-surface mb-1" for="password">Password</label>
                        <div class="relative">
                            <input class="w-full bg-surface border border-outline-variant rounded-lg pl-4 pr-10 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="password" id="password" placeholder="••••••••" required />
                            <button type="button" onclick="togglePassword('password', 'eye-icon-1')" class="absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-primary transition-colors outline-none cursor-pointer">
                                <span id="eye-icon-1" class="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                        </div>
                        <p class="text-xs text-outline mt-1">* Will be securely hashed.</p>
                    </div>

                    <!-- Confirm Password with Toggle (Stacked) -->
                    <div>
                        <label class="block font-label-md text-on-surface mb-1" for="confirm-password">Confirm Password</label>
                        <div class="relative">
                            <input class="w-full bg-surface border border-outline-variant rounded-lg pl-4 pr-10 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="password" id="confirm-password" placeholder="••••••••" required oninput="checkPasswordMatch('password', 'confirm-password', 'password-error')" />
                            <button type="button" onclick="togglePassword('confirm-password', 'eye-icon-2')" class="absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-primary transition-colors outline-none cursor-pointer">
                                <span id="eye-icon-2" class="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                        </div>
                        <p id="password-error" class="text-xs text-error font-bold hidden mt-1">Passwords do not match.</p>
                    </div>

                    <!-- Submit Button -->
                    <button class="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm mt-4 cursor-pointer" type="submit" onclick="return validateRegistration(event, 'student')">
                        Create Active Account
                    </button>
                    
                    <!-- Google Sign In Divider -->
                    <div class="relative mt-5 mb-4">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-surface-variant"></div>
                        </div>
                        <div class="relative flex justify-center text-sm">
                            <span class="px-2 bg-surface-container-lowest text-outline text-xs">Or continue with</span>
                        </div>
                    </div>

                    <!-- Google Sign In Button -->
                    <button type="button" class="w-full flex items-center justify-center gap-3 bg-white border border-outline-variant rounded-full px-4 py-2.5 text-body-md font-label-md text-on-surface hover:bg-surface-container-low transition-all shadow-sm cursor-pointer">
                        <!-- Official Google "G" Logo SVG -->
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" class="w-5 h-5" />
                        Sign in with Google
                    </button>

                </form>

                <div class="text-center mt-5">
                    <p class="text-body-sm text-on-surface-variant">Already have an account? <a href="#" onclick="document.getElementById('register-student-modal').classList.add('hidden'); document.getElementById('login-modal').classList.remove('hidden');" class="text-primary font-bold hover:underline">Sign In</a></p>
                </div>
            </div>

        </div>
    </div>
</div>

<!-- 3. NO-SCROLL TEACHER REGISTRATION FORM MODAL POPUP -->
<div id="register-teacher-modal" class="hidden fixed inset-0 z-[110] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div class="relative w-full max-w-5xl min-h-[700px] flex flex-col justify-center bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 md:p-12 border border-surface-variant overflow-hidden">
        
        <!-- Close Button -->
        <button onclick="document.getElementById('register-teacher-modal').classList.add('hidden')" class="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
            <span class="material-symbols-outlined text-[32px]">close</span>
        </button>

        <!-- Two-Column Grid Layout -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            
            <!-- Left Column: Branding & Intro -->
            <div class="flex flex-col items-center text-center md:border-r border-surface-variant md:pr-8">
                <div class="w-32 h-32 mb-6 rounded-full overflow-hidden bg-secondary-fixed/40 flex items-center justify-center">
                    <img src="https://cdn-icons-png.flaticon.com/512/3429/3429433.png" alt="Cartoon Teacher Avatar" class="w-24 h-24 object-contain drop-shadow-md hover:scale-110 transition-transform duration-300"/>
                </div>
                <h2 class="font-headline-md text-headline-md text-primary mb-3">Teacher Application</h2>
                <p class="text-body-md text-on-surface-variant max-w-xs mb-4">Join our community of expert educators. Provide your details and credentials below.</p>
                <div class="bg-surface-container-low p-4 rounded-lg border border-surface-dim">
                    <p class="text-label-md font-label-md text-primary flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-[18px]">info</span>
                        Pending Review Process
                    </p>
                    <p class="text-xs text-on-surface-variant mt-2 leading-relaxed">To ensure scholarly excellence, all new teacher accounts are placed in a <strong>Pending status</strong>. Scheduling tools will unlock once an Administrator verifies your qualifications.</p>
                </div>
            </div>

            <!-- Right Column: The Form -->
            <div>
                <form class="space-y-4" action="#" method="POST">
                    
                    <!-- Side-by-Side Names Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <!-- First Name -->
                        <div>
                            <label class="block font-label-md text-on-surface mb-1" for="teacher-firstname">First Name</label>
                            <input class="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="teacher-firstname" placeholder="First name" required />
                            <p id="teacher-firstname-error" class="text-xs text-error font-bold hidden mt-1">Please provide your First Name.</p>
                        </div>

                        <!-- Last Name (Optional) -->
                        <div>
                            <label class="block font-label-md text-on-surface mb-1" for="teacher-lastname">Last Name <span class="text-outline font-normal">(Optional)</span></label>
                            <input class="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="teacher-lastname" placeholder="Last name" />
                        </div>
                    </div>

                    <!-- Email with Verify Button -->
                    <div>
                        <label class="block font-label-md text-on-surface mb-1" for="teacher-email">Email Address</label>
                        <div class="flex gap-2">
                            <input class="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="email" id="teacher-email" placeholder="teacher@example.com" required />
                            <button type="button" id="teacher-verify-btn" onclick="openOtpTeacher()" class="shrink-0 bg-surface-container-high text-on-surface font-label-md px-4 py-2.5 rounded-lg hover:bg-surface-dim transition-all border border-outline-variant cursor-pointer">Verify</button>
                        </div>
                        <div class="flex justify-between items-center mt-1">
                            <p class="text-xs text-outline">* Must be a unique email address.</p>
                            <!-- Hidden Verified Text -->
                            <p id="teacher-verified-text" class="text-xs text-green-600 font-bold hidden flex items-center gap-1">
                                <span class="material-symbols-outlined text-[14px]">check_circle</span> Verified!
                            </p>
                        </div>
                        <p id="teacher-email-error" class="text-xs text-error font-bold hidden mt-1">Please enter a valid email address.</p>
                    </div>

                    <!-- Professional Qualifications with Yellow Upload Button -->
                    <div>
                        <label class="block font-label-md text-on-surface mb-1" for="teacher-qualifications">Professional Qualifications</label>
                        <div class="flex gap-2">
                            <input class="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="text" id="teacher-qualifications" placeholder="e.g. BSc. Mathematics" required />
                            <!-- Yellow Upload Button -->
                            <input type="file" id="teacher-qual-file" class="hidden" onchange="handleFileUpload(this)" />
                            <button type="button" id="teacher-upload-btn" onclick="document.getElementById('teacher-qual-file').click()" class="shrink-0 bg-secondary-container text-on-secondary-container font-label-md px-4 py-2.5 rounded-lg hover:bg-secondary-fixed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm w-[116px]">
                                <span class="material-symbols-outlined text-[18px]" id="teacher-upload-icon">upload_file</span> 
                                <span id="teacher-upload-text">Upload</span>
                            </button>
                        </div>
                        <p id="teacher-qualifications-error" class="text-xs text-error font-bold hidden mt-1">Please provide your professional qualifications.</p>
                        <p class="text-xs text-outline mt-1">* Required for administrative verification. Please upload certificates.</p>
                    </div>

                    <!-- Password with Toggle (Stacked) -->
                    <div>
                        <label class="block font-label-md text-on-surface mb-1" for="teacher-password">Password</label>
                        <div class="relative">
                            <input class="w-full bg-surface border border-outline-variant rounded-lg pl-4 pr-10 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="password" id="teacher-password" placeholder="••••••••" required />
                            <button type="button" onclick="togglePassword('teacher-password', 'teacher-eye-icon-1')" class="absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-primary transition-colors outline-none cursor-pointer">
                                <span id="teacher-eye-icon-1" class="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                        </div>
                        <p class="text-xs text-outline mt-1">* Will be securely hashed.</p>
                    </div>

                    <!-- Confirm Password with Toggle (Stacked) -->
                    <div>
                        <label class="block font-label-md text-on-surface mb-1" for="teacher-confirm-password">Confirm Password</label>
                        <div class="relative">
                            <input class="w-full bg-surface border border-outline-variant rounded-lg pl-4 pr-10 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="password" id="teacher-confirm-password" placeholder="••••••••" required oninput="checkPasswordMatch('teacher-password', 'teacher-confirm-password', 'teacher-password-error')" />
                            <button type="button" onclick="togglePassword('teacher-confirm-password', 'teacher-eye-icon-2')" class="absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-primary transition-colors outline-none cursor-pointer">
                                <span id="teacher-eye-icon-2" class="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                        </div>
                        <p id="teacher-password-error" class="text-xs text-error font-bold hidden mt-1">Passwords do not match.</p>
                    </div>

                    <!-- Submit Button -->
                    <button class="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm mt-4 cursor-pointer" type="submit" onclick="return validateRegistration(event, 'teacher')">
                        Submit Teacher Application
                    </button>
                </form>

                <div class="text-center mt-4">
                    <p class="text-body-sm text-on-surface-variant">Already an approved teacher? <a href="#" onclick="document.getElementById('register-teacher-modal').classList.add('hidden'); document.getElementById('login-modal').classList.remove('hidden');" class="text-primary font-bold hover:underline">Sign In</a></p>
                </div>
            </div>

        </div>
    </div>
</div>

<!-- STUDENT OTP MODAL POPUP -->
<div id="otp-student-modal" class="hidden fixed inset-0 z-[130] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div class="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <!-- Close Button (Returns to Registration) -->
        <button onclick="document.getElementById('otp-student-modal').classList.add('hidden'); document.getElementById('register-student-modal').classList.remove('hidden');" class="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none">
            <span class="material-symbols-outlined text-[28px]">close</span>
        </button>

        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-fixed/40 flex items-center justify-center">
            <span class="material-symbols-outlined text-[32px] text-primary">mark_email_read</span>
        </div>
        <h2 class="font-display-sm text-[28px] font-bold text-primary mb-2">Check your email</h2>
        <p class="text-body-md text-on-surface-variant mb-6">We sent a 5-digit verification code to your email address.</p>
        
        <div class="flex justify-center gap-3 mb-8">
            <input type="text" maxlength="1" class="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            <input type="text" maxlength="1" class="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            <input type="text" maxlength="1" class="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            <input type="text" maxlength="1" class="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            <input type="text" maxlength="1" class="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
        </div>

        <button id="otp-student-verify-btn" onclick="submitOtpStudent()" class="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer flex justify-center items-center">Verify Code</button>
        <div class="mt-6 text-center">
            <p id="otp-student-resend-text" class="text-body-sm text-on-surface-variant">Didn't receive it? Resend in <span id="otp-student-timer" class="font-bold">60</span>s</p>
            <a href="#" id="otp-student-resend-link" onclick="startOtpTimer('student'); return false;" class="hidden text-body-sm text-primary font-bold hover:underline">Resend Code</a>
        </div>
    </div>
</div>

<!-- TEACHER OTP MODAL POPUP -->
<div id="otp-teacher-modal" class="hidden fixed inset-0 z-[130] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div class="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <!-- Close Button (Returns to Registration) -->
        <button onclick="document.getElementById('otp-teacher-modal').classList.add('hidden'); document.getElementById('register-teacher-modal').classList.remove('hidden');" class="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none">
            <span class="material-symbols-outlined text-[28px]">close</span>
        </button>

        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary-fixed/40 flex items-center justify-center">
            <span class="material-symbols-outlined text-[32px] text-primary">mark_email_read</span>
        </div>
        <h2 class="font-display-sm text-[28px] font-bold text-primary mb-2">Check your email</h2>
        <p class="text-body-md text-on-surface-variant mb-6">We sent a 5-digit verification code to your email address.</p>
        
        <div class="flex justify-center gap-3 mb-8">
            <input type="text" maxlength="1" class="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            <input type="text" maxlength="1" class="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            <input type="text" maxlength="1" class="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            <input type="text" maxlength="1" class="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            <input type="text" maxlength="1" class="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
        </div>

        <button id="otp-teacher-verify-btn" onclick="submitOtpTeacher()" class="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer flex justify-center items-center">Verify Code</button>
        <div class="mt-6 text-center">
            <p id="otp-teacher-resend-text" class="text-body-sm text-on-surface-variant">Didn't receive it? Resend in <span id="otp-teacher-timer" class="font-bold">60</span>s</p>
            <a href="#" id="otp-teacher-resend-link" onclick="startOtpTimer('teacher'); return false;" class="hidden text-body-sm text-primary font-bold hover:underline">Resend Code</a>
        </div>
    </div>
</div>

<!-- 3. LOGIN MODAL POPUP -->
<div id="login-modal" class="hidden fixed inset-0 z-[120] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div class="relative w-full max-w-4xl bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 md:p-12 border border-surface-variant overflow-hidden">
        
        <!-- Close Button -->
        <button onclick="document.getElementById('login-modal').classList.add('hidden')" class="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
            <span class="material-symbols-outlined text-[32px]">close</span>
        </button>

        <!-- Centered Header exactly like Register Modal -->
        <div class="text-center mb-10">
            <h2 class="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg font-bold text-primary mb-4">Welcome Back!</h2>
            <p class="font-body-lg text-body-lg text-on-surface-variant">Select your role to log in to your account.</p>
        </div>

        <!-- Two-Column Grid Layout -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            
            <!-- Left Column: Branding & Role Toggles -->
            <div class="flex flex-col items-center justify-center text-center md:border-r border-surface-variant md:pr-8">
                <div class="w-32 h-32 mb-8 rounded-full overflow-hidden flex items-center justify-center">
                    <img src="https://cdn-icons-png.flaticon.com/512/3135/3135810.png" id="login-avatar" alt="Login Avatar" class="w-24 h-24 object-contain drop-shadow-md transition-transform duration-300"/>
                </div>

                <!-- Role Selection Toggles -->
                <div class="grid grid-cols-2 gap-4 w-full">
                    <!-- Student Box (Default Active) -->
                    <div id="login-role-student" onclick="selectLoginRole('student')" class="border-2 border-primary bg-primary-fixed/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300">
                        <span class="font-label-md text-primary font-bold">Student</span>
                    </div>

                    <!-- Teacher Box -->
                    <div id="login-role-teacher" onclick="selectLoginRole('teacher')" class="border-2 border-surface-variant bg-surface hover:border-outline-variant rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300">
                        <span class="font-label-md text-on-surface-variant">Teacher</span>
                    </div>
                </div>
            </div>

            <!-- Right Column: The Login Form -->
            <div>
                <form onsubmit="handleLogin(event)" class="space-y-4">
                    
                    <!-- Email -->
                    <div>
                        <label class="block font-label-md text-on-surface mb-1" for="login-email">Email Address</label>
                        <input class="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="email" id="login-email" placeholder="Enter your email" required />
                    </div>

                    <!-- Password with Toggle & Forgot Link -->
                    <div>
                        <label class="block font-label-md text-on-surface mb-1" for="login-password">Password</label>
                        <div class="relative">
                            <input class="w-full bg-surface border border-outline-variant rounded-lg pl-4 pr-10 py-3 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="password" id="login-password" placeholder="••••••••" required />
                            <button type="button" onclick="togglePassword('login-password', 'login-eye-icon')" class="absolute inset-y-0 right-0 px-3 flex items-center text-on-surface-variant hover:text-primary transition-colors outline-none cursor-pointer">
                                <span id="login-eye-icon" class="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                        </div>
                        <!-- Forgot Password Link -->
                        <div class="flex justify-end mt-2">
                            <a href="#" onclick="startForgotPasswordFlow()" class="text-sm font-label-md text-primary hover:underline">Forgot password?</a>
                        </div>
                    </div>

                    <!-- Hidden Error Simulation Message -->
                    <p id="login-error" class="hidden text-sm text-error font-medium bg-error-container p-3 rounded-lg border border-error/20 flex items-center gap-2">
                        <span class="material-symbols-outlined text-[18px]">error</span>
                        Invalid email or password.
                    </p>

                    <!-- Submit Button -->
                    <button class="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm mt-2 cursor-pointer" type="submit">
                        Log In
                    </button>
                    
                    <!-- Google Sign In Divider -->
                    <div class="relative mt-6 mb-4">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-surface-variant"></div>
                        </div>
                        <div class="relative flex justify-center text-sm">
                            <span class="px-2 bg-surface-container-lowest text-outline text-xs">Or continue with</span>
                        </div>
                    </div>

                    <!-- Google Sign In Button -->
                    <button type="button" class="w-full flex items-center justify-center gap-3 bg-white border border-outline-variant rounded-full px-4 py-3 text-body-md font-label-md text-on-surface hover:bg-surface-container-low transition-all shadow-sm cursor-pointer">
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" class="w-5 h-5" />
                        Sign in with Google
                    </button>
                </form>

                <!-- Registration Link -->
                <div class="text-center mt-8">
                    <p class="text-body-sm text-on-surface-variant">Don't have an account? <a href="#" onclick="document.getElementById('login-modal').classList.add('hidden'); document.getElementById('register-modal').classList.remove('hidden');" class="text-primary font-bold hover:underline">Register here</a></p>
                </div>
            </div>

        </div>
    </div>
</div>

<!-- STUDENT SUCCESS MODAL POPUP -->
<div id="success-student-modal" class="hidden fixed inset-0 z-[140] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div class="relative w-full max-w-sm bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center animate-bounce shadow-sm">
            <span class="text-[48px]">🎉</span>
        </div>
        <h2 class="font-display-sm text-[28px] font-bold text-primary mb-2">Congratulations!</h2>
        <p class="text-body-md text-on-surface-variant mb-8">You are now a member of A1 Academy! Start browsing courses and earning your digital badges today.</p>
        
        <button onclick="document.getElementById('success-student-modal').classList.add('hidden'); document.getElementById('login-modal').classList.remove('hidden');" class="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer">Continue to Login</button>
    </div>
</div>

<!-- TEACHER PENDING MODAL POPUP -->
<div id="pending-teacher-modal" class="hidden fixed inset-0 z-[140] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div class="relative w-full max-w-sm bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-secondary-container flex items-center justify-center shadow-sm">
            <span class="material-symbols-outlined text-[48px] text-on-secondary-container animate-pulse">hourglass_top</span>
        </div>
        <h2 class="font-display-sm text-[28px] font-bold text-primary mb-2">Application Submitted!</h2>
        <p class="text-body-md text-on-surface-variant mb-8">Your credentials have been sent to our Administrators for verification. Once approved, you will receive an email notification and can log in to access your dashboard.</p>
        
        <button onclick="document.getElementById('pending-teacher-modal').classList.add('hidden');" class="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer">Got it!</button>
    </div>
</div>

<!-- FORGOT PASSWORD: STEP 1 (EMAIL REQUEST) -->
<div id="forgot-password-modal" class="hidden fixed inset-0 z-[130] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div class="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <button onclick="document.getElementById('forgot-password-modal').classList.add('hidden'); document.getElementById('login-modal').classList.remove('hidden');" class="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
            <span class="material-symbols-outlined text-[32px]">close</span>
        </button>
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-fixed/40 flex items-center justify-center">
            <span class="material-symbols-outlined text-[32px] text-primary">lock_reset</span>
        </div>
        <h2 class="font-display-sm text-[28px] font-bold text-primary mb-2">Reset Password</h2>
        <p class="text-body-md text-on-surface-variant mb-6">Enter the email address associated with your account, and we'll send you a code to reset your password.</p>
        <div class="text-left mb-6">
            <label class="block font-label-md text-on-surface mb-1" for="forgot-email">Email Address</label>
            <input class="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="email" id="forgot-email" placeholder="e.g. hello@example.com" required />
            <p id="forgot-email-error" class="text-xs text-error font-bold hidden mt-1">Please enter a valid email address.</p>
        </div>
        <button onclick="sendForgotOtp()" class="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer">Send Reset Code</button>
    </div>
</div>

<!-- FORGOT PASSWORD: STEP 2 (OTP VERIFICATION) -->
<div id="otp-reset-modal" class="hidden fixed inset-0 z-[140] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div class="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <button onclick="document.getElementById('otp-reset-modal').classList.add('hidden'); document.getElementById('forgot-password-modal').classList.remove('hidden');" class="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors cursor-pointer outline-none z-10">
            <span class="material-symbols-outlined text-[32px]">close</span>
        </button>
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary-fixed/40 flex items-center justify-center">
            <span class="material-symbols-outlined text-[32px] text-primary">mark_email_read</span>
        </div>
        <h2 class="font-display-sm text-[28px] font-bold text-primary mb-2">Check your email</h2>
        <p class="text-body-md text-on-surface-variant mb-6">We sent a 5-digit reset code to your email.</p>
        
        <div class="flex justify-center gap-3 mb-8">
            <input type="text" maxlength="1" class="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            <input type="text" maxlength="1" class="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            <input type="text" maxlength="1" class="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            <input type="text" maxlength="1" class="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            <input type="text" maxlength="1" class="w-12 h-14 text-center font-headline-md text-primary bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
        </div>

        <button id="otp-reset-verify-btn" onclick="verifyForgotOtp()" class="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer flex justify-center items-center">Verify Code</button>
        
        <!-- Resend Code -->
        <div class="mt-6 text-body-sm text-on-surface-variant flex items-center justify-center gap-2">
            <span>Didn't receive the code?</span>
            <span id="reset-resend-timer" class="text-primary font-bold">60s</span>
            <button id="reset-resend-btn" class="hidden text-primary font-bold hover:underline outline-none cursor-pointer">Resend</button>
        </div>
    </div>
</div>

<!-- FORGOT PASSWORD: STEP 3 (NEW PASSWORD) -->
<div id="new-password-modal" class="hidden fixed inset-0 z-[150] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div class="relative w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-fixed/40 flex items-center justify-center">
            <span class="material-symbols-outlined text-[32px] text-primary">key</span>
        </div>
        <h2 class="font-display-sm text-[28px] font-bold text-primary mb-2">Create New Password</h2>
        <p class="text-body-md text-on-surface-variant mb-6">Your identity has been verified. Please set a new password for your account.</p>
        
        <div class="text-left mb-4">
            <label class="block font-label-md text-on-surface mb-1" for="reset-new-password">New Password</label>
            <div class="relative">
                <input class="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="password" id="reset-new-password" placeholder="Enter new password" required oninput="checkResetPasswordMatch()" />
            </div>
        </div>
        <div class="text-left mb-6">
            <label class="block font-label-md text-on-surface mb-1" for="reset-confirm-password">Confirm Password</label>
            <div class="relative">
                <input class="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="password" id="reset-confirm-password" placeholder="Confirm new password" required oninput="checkResetPasswordMatch()" />
            </div>
            <p id="reset-password-error" class="text-xs text-error font-bold hidden mt-1">Passwords do not match.</p>
        </div>

        <button onclick="saveNewPassword()" class="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer">Save New Password</button>
    </div>
</div>

<!-- FORGOT PASSWORD: STEP 4 (SUCCESS ANIMATION) -->
<div id="success-reset-modal" class="hidden fixed inset-0 z-[160] flex items-center justify-center backdrop-blur-md bg-on-surface/40 p-4 transition-all duration-300">
    <div class="relative w-full max-w-sm bg-surface-container-lowest rounded-[24px] shadow-level-3 p-8 border border-surface-variant text-center">
        <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center shadow-sm">
            <span class="material-symbols-outlined text-[48px] text-green-600">check_circle</span>
        </div>
        <h2 class="font-display-sm text-[28px] font-bold text-primary mb-2">Password Reset!</h2>
        <p class="text-body-md text-on-surface-variant mb-8">Your password has been successfully updated. You can now log in with your new credentials.</p>
        
        <button onclick="document.getElementById('success-reset-modal').classList.add('hidden'); document.getElementById('login-modal').classList.remove('hidden');" class="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-sm cursor-pointer">Return to Login</button>
    </div>
</div>

    `;
    document.body.appendChild(modalsContainer);

    // Add robust event listeners for role selection
    const studentCard = document.getElementById('role-select-student');
    const teacherCard = document.getElementById('role-select-teacher');
    if (studentCard) {
        studentCard.addEventListener('click', () => {
            document.getElementById('register-modal').classList.add('hidden');
            document.getElementById('register-student-modal').classList.remove('hidden');
        });
    }
    if (teacherCard) {
        teacherCard.addEventListener('click', () => {
            document.getElementById('register-modal').classList.add('hidden');
            document.getElementById('register-teacher-modal').classList.remove('hidden');
        });
    }

    // Auto-focus progression for OTP inputs
    const otpGroups = [
        document.querySelectorAll('#otp-student-modal input[type="text"]'),
        document.querySelectorAll('#otp-teacher-modal input[type="text"]'),
        document.querySelectorAll('#otp-reset-modal input[type="text"]')
    ];
    
    otpGroups.forEach(inputs => {
        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                // Only allow numbers
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                // Move to next input if filled
                if (e.target.value !== '' && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            });
            // Handle backspace to move to previous input
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                    inputs[index - 1].focus();
                }
            });
        });
    });
});

// GLOBAL FUNCTIONS (Must be outside DOMContentLoaded to be accessible by onclick)

// 1. Password Visibility Toggle
function togglePassword(inputId, iconId) {
    const passwordInput = document.getElementById(inputId);
    const eyeIcon = document.getElementById(iconId);
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.textContent = 'visibility_off';
    } else {
        passwordInput.type = 'password';
        eyeIcon.textContent = 'visibility';
    }
}

function checkPasswordMatch(passId, confirmId, errorId) {
    const pass = document.getElementById(passId).value;
    const confirmPass = document.getElementById(confirmId).value;
    const errorEl = document.getElementById(errorId);
    
    if (confirmPass.length > 0 && pass !== confirmPass) {
        errorEl.classList.remove('hidden');
    } else {
        errorEl.classList.add('hidden');
    }
}

function validateRegistration(event, type) {
    let emailId, emailErrorId, firstNameId, firstNameErrorId, passId, confirmId, passErrorId, qualsId, qualErrorId;

    if (type === 'student') {
        emailId = 'email';
        emailErrorId = 'email-error';
        firstNameId = 'firstname';
        firstNameErrorId = 'firstname-error';
        passId = 'password';
        confirmId = 'confirm-password';
        passErrorId = 'password-error';
    } else if (type === 'teacher') {
        emailId = 'teacher-email';
        emailErrorId = 'teacher-email-error';
        firstNameId = 'teacher-firstname';
        firstNameErrorId = 'teacher-firstname-error';
        passId = 'teacher-password';
        confirmId = 'teacher-confirm-password';
        passErrorId = 'teacher-password-error';
        qualsId = 'teacher-qualifications';
        qualErrorId = 'teacher-qualifications-error';
    }

    const emailInput = document.getElementById(emailId);
    const emailErrorEl = document.getElementById(emailErrorId);
    const firstName = document.getElementById(firstNameId).value;
    const firstNameErrorEl = document.getElementById(firstNameErrorId);
    const pass = document.getElementById(passId).value;
    const confirmPass = document.getElementById(confirmId).value;
    const passErrorEl = document.getElementById(passErrorId);

    let isValid = true;

    // 1. Check First Name
    if (!firstName) {
        firstNameErrorEl.classList.remove('hidden');
        isValid = false;
    } else {
        firstNameErrorEl.classList.add('hidden');
    }

    // 2. Check if Email is verified (it becomes readonly when verified)
    if (!emailInput.hasAttribute('readonly')) {
        emailErrorEl.textContent = "Please verify your email address first.";
        emailErrorEl.classList.remove('hidden');
        isValid = false;
    } else {
        // Don't hide it immediately if there is a Regex error from openOtpStudent, but it shouldn't matter on submit if verified.
        emailErrorEl.classList.add('hidden');
    }

    // 3. Check Qualifications (Teacher only)
    if (qualsId && qualErrorId) {
        const qualifications = document.getElementById(qualsId).value;
        const qualFile = document.getElementById('teacher-qual-file');
        const qualErrorEl = document.getElementById(qualErrorId);
        
        const hasFile = qualFile && qualFile.files && qualFile.files.length > 0;

        if (!qualifications || !hasFile) {
            qualErrorEl.textContent = (!qualifications && !hasFile) 
                ? "Please provide your qualifications and upload a certificate."
                : (!qualifications) 
                    ? "Please provide your professional qualifications."
                    : "Please upload your qualification certificate.";
            qualErrorEl.classList.remove('hidden');
            isValid = false;
        } else {
            qualErrorEl.classList.add('hidden');
        }
    }

    // 4. Check Password match and not empty
    if (!pass || !confirmPass || pass !== confirmPass) {
        passErrorEl.textContent = (!pass || !confirmPass) ? "Please enter and confirm your password." : "Passwords do not match.";
        passErrorEl.classList.remove('hidden');
        isValid = false;
    } else {
        passErrorEl.classList.add('hidden');
    }

    if (!isValid) {
        event.preventDefault();
        return false;
    }

    // Proceed to create account
    if (type === 'student') {
        document.getElementById('register-student-modal').classList.add('hidden');
        document.getElementById('success-student-modal').classList.remove('hidden');
    } else {
        document.getElementById('register-teacher-modal').classList.add('hidden');
        document.getElementById('pending-teacher-modal').classList.remove('hidden');
    }
    event.preventDefault(); // Prevent real form submission for demo purposes
    return true;
}

function handleFileUpload(input) {
    if (input.files && input.files.length > 0) {
        const icon = document.getElementById('teacher-upload-icon');
        const text = document.getElementById('teacher-upload-text');
        icon.textContent = 'check_circle';
        text.textContent = 'Uploaded';
    }
}

// --- FORGOT PASSWORD FLOW ---

function startForgotPasswordFlow() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('forgot-password-modal').classList.remove('hidden');
}

function sendForgotOtp() {
    const email = document.getElementById('forgot-email').value;
    const errorEl = document.getElementById('forgot-email-error');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        errorEl.classList.remove('hidden');
        return;
    }
    errorEl.classList.add('hidden');
    
    const btn = document.querySelector('#forgot-password-modal button[onclick="sendForgotOtp()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin mr-2">progress_activity</span> Sending...';
    btn.disabled = true;

    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        document.getElementById('forgot-password-modal').classList.add('hidden');
        document.getElementById('otp-reset-modal').classList.remove('hidden');
        
        const inputs = document.querySelectorAll('#otp-reset-modal input[type="text"]');
        if (inputs.length > 0) inputs[0].focus();
    }, 1500);
}

function verifyForgotOtp() {
    const btn = document.getElementById('otp-reset-verify-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span>';
    btn.disabled = true;

    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        document.getElementById('otp-reset-modal').classList.add('hidden');
        document.getElementById('new-password-modal').classList.remove('hidden');
    }, 1500);
}

function checkResetPasswordMatch() {
    const pass = document.getElementById('reset-new-password').value;
    const confirm = document.getElementById('reset-confirm-password').value;
    const errorEl = document.getElementById('reset-password-error');

    if (confirm.length > 0 && pass !== confirm) {
        errorEl.classList.remove('hidden');
    } else {
        errorEl.classList.add('hidden');
    }
}

function saveNewPassword() {
    const pass = document.getElementById('reset-new-password').value;
    const confirm = document.getElementById('reset-confirm-password').value;
    const errorEl = document.getElementById('reset-password-error');

    if (!pass || !confirm || pass !== confirm) {
        errorEl.textContent = (!pass || !confirm) ? "Please enter and confirm your password." : "Passwords do not match.";
        errorEl.classList.remove('hidden');
        return;
    }
    
    errorEl.classList.add('hidden');
    
    document.getElementById('new-password-modal').classList.add('hidden');
    document.getElementById('success-reset-modal').classList.remove('hidden');
}

function simulateVerification() {
    // Hide the Verify Button
    document.getElementById('verify-btn').classList.add('hidden');
    // Make the email input visually locked (readonly)
    const emailInput = document.getElementById('email');
    emailInput.setAttribute('readonly', true);
    emailInput.classList.add('bg-surface-container-low', 'text-on-surface-variant');
    emailInput.classList.remove('bg-surface');
    // Show the green Verified text
    document.getElementById('verified-text').classList.remove('hidden');
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let otpTimers = { student: null, teacher: null };

function startOtpTimer(role) {
    let timeLeft = 60;
    const timerEl = document.getElementById(`otp-${role}-timer`);
    const textEl = document.getElementById(`otp-${role}-resend-text`);
    const linkEl = document.getElementById(`otp-${role}-resend-link`);
    
    // Reset UI
    timerEl.textContent = timeLeft;
    textEl.classList.remove('hidden');
    linkEl.classList.add('hidden');
    
    // Clear existing timer if any
    if(otpTimers[role]) clearInterval(otpTimers[role]);
    
    otpTimers[role] = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(otpTimers[role]);
            textEl.classList.add('hidden');
            linkEl.classList.remove('hidden');
        }
    }, 1000);
}

function openOtpStudent() {
    const emailInput = document.getElementById('email').value;
    const errorMsg = document.getElementById('email-error');
    
    if(!emailRegex.test(emailInput)) {
        errorMsg.classList.remove('hidden');
        return;
    }
    errorMsg.classList.add('hidden');
    document.getElementById('register-student-modal').classList.add('hidden');
    document.getElementById('otp-student-modal').classList.remove('hidden');
    startOtpTimer('student');
}

function submitOtpStudent() {
    const btn = document.getElementById('otp-student-verify-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Verifying...';
    btn.disabled = true;
    btn.classList.add('opacity-80', 'cursor-not-allowed');
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.classList.remove('opacity-80', 'cursor-not-allowed');
        
        document.getElementById('otp-student-modal').classList.add('hidden');
        document.getElementById('register-student-modal').classList.remove('hidden');
        simulateVerification();
    }, 1500);
}

function openOtpTeacher() {
    const emailInput = document.getElementById('teacher-email').value;
    const errorMsg = document.getElementById('teacher-email-error');
    
    if(!emailRegex.test(emailInput)) {
        errorMsg.classList.remove('hidden');
        return;
    }
    errorMsg.classList.add('hidden');
    document.getElementById('register-teacher-modal').classList.add('hidden');
    document.getElementById('otp-teacher-modal').classList.remove('hidden');
    startOtpTimer('teacher');
}

function submitOtpTeacher() {
    const btn = document.getElementById('otp-teacher-verify-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Verifying...';
    btn.disabled = true;
    btn.classList.add('opacity-80', 'cursor-not-allowed');
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        btn.classList.remove('opacity-80', 'cursor-not-allowed');
        
        document.getElementById('otp-teacher-modal').classList.add('hidden');
        document.getElementById('register-teacher-modal').classList.remove('hidden');
        simulateTeacherVerification();
    }, 1500);
}

function simulateTeacherVerification() {
    // Hide the Verify Button
    document.getElementById('teacher-verify-btn').classList.add('hidden');
    // Make the email input visually locked (readonly)
    const emailInput = document.getElementById('teacher-email');
    emailInput.setAttribute('readonly', true);
    emailInput.classList.add('bg-surface-container-low', 'text-on-surface-variant');
    emailInput.classList.remove('bg-surface');
    // Show the green Verified text
    document.getElementById('teacher-verified-text').classList.remove('hidden');
}

// 3. Login Role Selection Toggle Logic
function selectLoginRole(selectedRole) {
    const studentBox = document.getElementById('login-role-student');
    const teacherBox = document.getElementById('login-role-teacher');
    const avatar = document.getElementById('login-avatar');
    
    const activeClasses = ['border-primary', 'bg-primary-fixed/20'];
    const inactiveClasses = ['border-surface-variant', 'bg-surface', 'hover:border-outline-variant'];

    if(selectedRole === 'student') {
        studentBox.classList.remove(...inactiveClasses);
        studentBox.classList.add(...activeClasses);
        studentBox.querySelector('span').classList.replace('text-on-surface-variant', 'text-primary');
        studentBox.querySelector('span').classList.add('font-bold');

        teacherBox.classList.remove(...activeClasses);
        teacherBox.classList.add(...inactiveClasses);
        teacherBox.querySelector('span').classList.replace('text-primary', 'text-on-surface-variant');
        teacherBox.querySelector('span').classList.remove('font-bold');
        
        avatar.src = 'https://cdn-icons-png.flaticon.com/512/3135/3135810.png';
    } else {
        teacherBox.classList.remove(...inactiveClasses);
        teacherBox.classList.add(...activeClasses);
        teacherBox.querySelector('span').classList.replace('text-on-surface-variant', 'text-primary');
        teacherBox.querySelector('span').classList.add('font-bold');

        studentBox.classList.remove(...activeClasses);
        studentBox.classList.add(...inactiveClasses);
        studentBox.querySelector('span').classList.replace('text-primary', 'text-on-surface-variant');
        studentBox.querySelector('span').classList.remove('font-bold');
        
        avatar.src = 'https://cdn-icons-png.flaticon.com/512/3429/3429433.png';
    }
}

// 4. Simulated Login Verification
function handleLogin(event) {
    event.preventDefault(); // Stop page from refreshing
    const emailInput = document.getElementById('login-email').value.toLowerCase();
    const errorBox = document.getElementById('login-error');

    if(emailInput === 'error' || emailInput === 'error@example.com') {
        errorBox.classList.remove('hidden'); // Show error banner
    } else {
        errorBox.classList.add('hidden'); // Hide error banner
        alert('Login successful! Redirecting to dashboard...');
    }
}
