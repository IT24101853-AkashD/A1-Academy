const fs = require('fs');
const path = require('path');

const authModalsPath = path.join(__dirname, 'src', 'components', 'AuthModals.jsx');
let content = fs.readFileSync(authModalsPath, 'utf8');

const searchRegex = /const firstNameId = role === 'Student' \? 'student-firstname' : 'teacher-firstname';\s*const firstName = document\.getElementById\(firstNameId\)\?\.value;\s*const email = document\.getElementById\(emailId\)\?\.value;\s*if \(!firstName\) \{\s*setFormErrors\(\{\.\.\.formErrors, \[firstNameId\]: 'First name is required before verifying email\.'\}\);\s*return;\s*\}/;

const replacement = `const firstNameId = role === 'Student' ? 'student-firstname' : 'teacher-firstname';
        const firstName = role.startsWith('AdminControls') ? 'Admin' : document.getElementById(firstNameId)?.value;
        const email = document.getElementById(emailId)?.value;

        if (!firstName && !role.startsWith('AdminControls')) {
            setFormErrors({...formErrors, [firstNameId]: 'First name is required before verifying email.'});
            return;
        }`;

if (searchRegex.test(content)) {
    content = content.replace(searchRegex, replacement);
    fs.writeFileSync(authModalsPath, content, 'utf8');
    console.log('Fixed sendOtp.');
} else {
    console.log('Could not find sendOtp logic to replace.');
}
