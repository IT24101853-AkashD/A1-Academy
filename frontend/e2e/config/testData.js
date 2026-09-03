/**
 * Test data for E2E Testing
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const TEST_USER = {
    teacher: {
        firstName: 'E2E',
        lastName: 'TeacherTest',
        email: `teacher-e2e-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        qualifications: 'BSc. Computer Science, MEd',
    },
    student: {
        firstName: 'E2E',
        lastName: 'StudentTest',
        email: `student-e2e-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
    }
};

const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    REGISTER_TEACHER: '/register/teacher',
    REGISTER_STUDENT: '/register/student',
    TEACHER_DASHBOARD: '/dashboard/teacher',
    STUDENT_DASHBOARD: '/dashboard/student',
};

const SELECTORS = {
    // Common
    CLOSE_BUTTON: 'button[aria-label="Close login modal"]',
    
    // Login Modal
    LOGIN_MODAL: '#login-modal',
    LOGIN_EMAIL_INPUT: 'input[type="email"]',
    LOGIN_PASSWORD_INPUT: 'input[type="password"]',
    LOGIN_SUBMIT_BUTTON: 'button[type="submit"]:not(.close)',
    
    // Teacher Registration Modal
    TEACHER_MODAL: '#register-teacher-modal',
    TEACHER_FIRSTNAME_INPUT: 'input#teacher-firstname',
    TEACHER_LASTNAME_INPUT: 'input#teacher-lastname',
    TEACHER_EMAIL_INPUT: 'input#teacher-email',
    TEACHER_EMAIL_VERIFY_BUTTON: 'button#teacher-verify-btn',
    TEACHER_QUALIFICATIONS_INPUT: 'input#teacher-qualifications',
    TEACHER_UPLOAD_BUTTON: 'button#teacher-upload-btn',
    TEACHER_PASSWORD_INPUT: 'input#teacher-password',
    TEACHER_CONFIRM_PASSWORD_INPUT: 'input#teacher-confirm-password',
    TEACHER_SUBMIT_BUTTON: 'button:contains("Submit Teacher Application")',
    
    // Student Registration Modal
    STUDENT_MODAL: '#register-student-modal',
    STUDENT_FIRSTNAME_INPUT: 'input#firstname',
    STUDENT_LASTNAME_INPUT: 'input#lastname',
    STUDENT_EMAIL_INPUT: 'input#email',
    STUDENT_EMAIL_VERIFY_BUTTON: 'button#verify-btn',
    STUDENT_PASSWORD_INPUT: 'input#password',
    STUDENT_CONFIRM_PASSWORD_INPUT: 'input#confirm-password',
    STUDENT_SUBMIT_BUTTON: 'button:contains("Create Active Account")',
    
    // Dashboard
    DASHBOARD_HEADING: 'h1, h2',
    LOGOUT_BUTTON: 'button:contains("Logout")',
};

module.exports = {
    BASE_URL,
    TEST_USER,
    ROUTES,
    SELECTORS,
};
