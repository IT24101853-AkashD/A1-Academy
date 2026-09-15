import React from 'react';

export default function RoleSelectStudent({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
<div className="text-center mb-10">
            <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg font-bold text-primary mb-4">Join A1 Academy</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Select your role to begin the registration process.</p>
        </div>

        <!-- Role Selection Cards Grid -->
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <!-- Student Card -->
            <div id="role-select-student" className="bg-white rounded-[16px] p-8 shadow-level-1 hover:shadow-level-2 transition-all duration-300 border-2 border-transparent hover:border-primary-fixed group flex flex-col items-center text-center cursor-pointer">
                <!-- Colorful Cartoon Student Image -->
                <div className="w-28 h-28 mb-6 rounded-full overflow-hidden bg-primary-fixed/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <img src="https://cdn-icons-png.flaticon.com/512/3135/3135810.png" alt="Cartoon Student Avatar" className="w-20 h-20 object-contain drop-shadow-md"/>
                </div>
                <h3 className="font-headline-sm text-[24px] text-primary mb-3">Register as a Student</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Browse courses, track your progress, and earn digital badges.</p>
            </div>

            <!-- Teacher Card -->
            <div id="role-select-teacher" className="bg-white rounded-[16px] p-8 shadow-level-1 hover:shadow-level-2 transition-all duration-300 border-2 border-transparent hover:border-primary-fixed group flex flex-col items-center text-center cursor-pointer">
                <!-- NEW Colorful Cartoon Teacher Image -->
                <div className="w-28 h-28 mb-6 rounded-full overflow-hidden bg-secondary-fixed/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <img src="https://cdn-icons-png.flaticon.com/512/3429/3429433.png" alt="Cartoon Teacher Avatar" className="w-20 h-20 object-contain drop-shadow-md"/>
                </div>
                <h3 className="font-headline-sm text-[24px] text-primary mb-3">Register as a Teacher</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Submit your qualifications, manage classes, and guide the next generation.</p>
            </div>

        </div>
    </div>
</div>
    );
}
