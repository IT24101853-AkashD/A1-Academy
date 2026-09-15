const fs = require('fs');
const path = require('path');

const authModalsPath = path.join(__dirname, 'src', 'components', 'AuthModals.jsx');
let content = fs.readFileSync(authModalsPath, 'utf8');

const sendOtpRegex = /const res = await fetch\(import\.meta\.env\.VITE_API_URL \+ '\/api\/auth\/send-otp', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ email, firstName \}\)\s*\}\);/;

const replacement = `const bodyPayload = { email, firstName };
            if (role.startsWith('AdminControls')) {
                bodyPayload.skipEmailCheck = true;
            }
            const res = await fetch(import.meta.env.VITE_API_URL + '/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });`;

if (sendOtpRegex.test(content)) {
    content = content.replace(sendOtpRegex, replacement);
    fs.writeFileSync(authModalsPath, content, 'utf8');
    console.log('Frontend AuthModals updated with skipEmailCheck.');
} else {
    console.log('Regex failed for AuthModals skipEmailCheck');
}
