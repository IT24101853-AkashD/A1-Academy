# E2E (End-to-End) Testing Guide

## Overview

This directory contains end-to-end tests for the A1-Academy full stack authentication flow. Tests verify the complete user journey from registration through login to dashboard access using Selenium WebDriver with WebdriverIO.

## Technology Stack

- **Test Framework:** WebdriverIO
- **Browser Automation:** Selenium WebDriver with Chrome
- **Test Runner:** Mocha
- **Language:** JavaScript (Node.js)

## Prerequisites

### System Requirements
- Node.js 16+ and npm
- Chrome/Chromium browser installed
- Frontend dev server running (`npm run dev`)
- Backend API running on configured port

### Installation

All dependencies are installed with npm:
```bash
npm install -D selenium-webdriver chromedriver webdriverio @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter
```

## Project Structure

```
e2e/
├── config/
│   └── testData.js          # Test data and selectors
├── utils/
│   └── helpers.js           # Reusable test helper functions
├── tests/
│   ├── teacher-signup.test.js      # Teacher registration E2E tests
│   ├── teacher-login.test.js       # Teacher login E2E tests
│   └── dashboard-access.test.js    # Dashboard access E2E tests
└── README.md (this file)

wdio.conf.js                 # WebdriverIO configuration
```

## Test Cases

### 1. Teacher Signup (teacher-signup.test.js)

Tests the complete teacher registration workflow:

- **Display Registration Modal:** Verify teacher registration modal appears
- **Valid Registration:** Complete signup with all required fields
  - First name, Last name
  - Email with verification
  - Professional qualifications
  - Password with confirmation
- **Invalid Email Detection:** Form rejects invalid email formats
- **Password Mismatch:** Form prevents submission with mismatched passwords

**Key Selectors:**
- First Name: `#teacher-firstname`
- Email: `#teacher-email`
- Qualifications: `#teacher-qualifications`
- Password: `#teacher-password`
- Confirm Password: `#teacher-confirm-password`

### 2. Teacher Login (teacher-login.test.js)

Tests the complete teacher authentication flow:

- **Login Modal Display:** Verify login interface appears
- **Valid Credentials Login:** Successfully authenticate with registered credentials
- **Invalid Email Format:** Prevent login with malformed email
- **Missing Password:** Form validation prevents empty password submission
- **JWT Token Storage:** Verify JWT stored in localStorage after successful login

**Key Selectors:**
- Email: `input[type="email"]`
- Password: `input[type="password"]`
- Login Modal: `#login-modal`

### 3. Dashboard Access (dashboard-access.test.js)

Tests dashboard navigation and access control:

- **Post-Login Navigation:** Verify redirect to teacher dashboard
- **Role-Specific Content:** Dashboard displays teacher-specific information
- **Logout Functionality:** Logout button present and functional
- **Unauthorized Access Prevention:** Unauthenticated users cannot access dashboard
- **Session Persistence:** Session maintained across page navigation

## Running Tests

### Run All E2E Tests
```bash
npm run e2e
```

### Run Specific Test Suites
```bash
# Teacher registration tests
npm run e2e:teacher

# Teacher login tests
npm run e2e:login

# Dashboard access tests
npm run e2e:dashboard
```

### Run with Direct WebdriverIO Command
```bash
npx wdio run wdio.conf.js
```

## Configuration (wdio.conf.js)

Key configurations:

```javascript
- runner: 'local'              // Local test runner
- port: 4444                   // WebDriver port
- maxInstances: 1              // Sequential test execution
- browserName: 'chrome'        // Target browser
- logLevel: 'warn'             // Log verbosity
- waitforTimeout: 10000        // Element wait timeout (ms)
- framework: 'mocha'           // Test framework
- timeout: 60000               // Test timeout (ms)
```

## Test Data (e2e/config/testData.js)

### Base URL
```javascript
BASE_URL = 'http://localhost:5173'  // Frontend dev server
```

### Test Users
```javascript
TEST_USER.teacher = {
    firstName: 'E2E',
    lastName: 'TeacherTest',
    email: 'teacher-e2e-{timestamp}@example.com',  // Unique per run
    password: 'SecurePassword123!',
    qualifications: 'BSc. Computer Science, MEd'
}
```

### Application Routes
```javascript
HOME: '/'
LOGIN: '/login'
REGISTER_TEACHER: '/register/teacher'
TEACHER_DASHBOARD: '/dashboard/teacher'
```

## Helper Functions (e2e/utils/helpers.js)

### Available Utilities

```javascript
// Wait for element visibility
await waitForElement(selector, timeout)

// Fill input field
await fillInput(selector, value)

// Click element
await clickElement(selector)

// Wait for URL navigation
await waitForNavigation(urlPattern, timeout)

// Get current URL
await getCurrentUrl()

// Wait for text to appear
await waitForText(selector, text, timeout)

// Check element visibility
await isElementVisible(selector)
```

## Writing New Tests

### Basic Test Structure
```javascript
const { fillInput, clickElement } = require('../../utils/helpers');
const { BASE_URL, TEST_USER, ROUTES } = require('../../config/testData');

describe('E2E: Feature Name', () => {
    beforeEach(async () => {
        await browser.navigateTo(BASE_URL + ROUTES.HOME);
    });

    it('should do something specific', async () => {
        await fillInput('input#email', 'test@example.com');
        await clickElement('button#submit');
        await browser.pause(1000);
        
        const url = await browser.getUrl();
        expect(url).toContain('dashboard');
    });
});
```

## Debugging Tests

### Take Screenshots
```javascript
await browser.takeScreenshot();  // Saves screenshot
```

### Debug Mode
```javascript
it('should test something', async () => {
    await browser.debug();  // Pauses test for debugging
    // Inspect browser state, then resume
});
```

### View Browser Console
```javascript
const logs = await browser.getLogs('browser');
console.log(logs);
```

## Troubleshooting

### Chrome Driver Issues
If ChromeDriver fails to start:
```bash
# Reinstall ChromeDriver
npm install --save-dev chromedriver@latest
```

### Timeout Errors
- Increase `waitforTimeout` in `wdio.conf.js`
- Verify frontend dev server is running on correct port
- Check backend API is accessible

### Element Not Found
- Verify selectors match current component HTML
- Use `browser.pause(ms)` to wait for dynamic rendering
- Check if element is in iframe or shadow DOM

### Authentication Issues
- Ensure test user account exists in database
- Verify API endpoint responds correctly
- Check CORS configuration for API

## CI/CD Integration

To run E2E tests in CI pipeline:

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: |
    npm install
    npm run dev &  # Start dev server in background
    sleep 5        # Wait for server to start
    npm run e2e    # Run tests
```

## Performance Considerations

- Tests run sequentially (maxInstances: 1)
- Each test takes 30-60 seconds
- Total suite execution: ~5-10 minutes
- Use before/afterEach hooks for setup/teardown

## Best Practices

1. **Use Explicit Waits:** Always wait for elements before interacting
   ```javascript
   await waitForElement(selector, timeout);
   ```

2. **Generate Unique Test Data:** Use timestamps for email addresses
   ```javascript
   email: `teacher-e2e-${Date.now()}@example.com`
   ```

3. **Handle Errors Gracefully:** Wrap optional checks in try-catch
   ```javascript
   try {
       // Optional UI element interaction
   } catch (error) {
       console.log('Expected: element not found');
   }
   ```

4. **Document Test Intent:** Use descriptive test names
   ```javascript
   it('should prevent form submission with invalid email format', async () => {})
   ```

5. **Isolate Test Cases:** Each test should be independent and not rely on others

## Expected Test Results

When all services are running correctly:

```
Test Files  1 passed (3)
Tests       12 passed (12)
Duration    ~300 seconds (5 minutes)

Teacher Signup Flow     ✓
Teacher Login Flow      ✓
Dashboard Access Flow   ✓
```

## Additional Resources

- [WebdriverIO Documentation](https://webdriver.io)
- [Selenium WebDriver](https://www.selenium.dev)
- [Mocha Test Framework](https://mochajs.org)
- [Testing Best Practices](https://testing-library.com/docs/guiding-principles)

## Support

For issues or questions about E2E testing:
1. Check the troubleshooting section
2. Review test logs and screenshots
3. Verify all prerequisites are met
4. Check backend API connectivity
