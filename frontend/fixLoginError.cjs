const fs = require('fs');
const path = require('path');

const authModalsPath = path.join(__dirname, 'src', 'components', 'AuthModals.jsx');
let content = fs.readFileSync(authModalsPath, 'utf8');

const oldElseBlock = `} else {
                setLoginErrors({ 'password': 'Invalid Email or Invalid Password' });
            }`;

const newElseBlock = `} else {
                try {
                    const errorText = await res.text();
                    if (errorText) {
                        // The backend might return a JSON error or plain string.
                        let msg = errorText;
                        try { 
                            const parsed = JSON.parse(errorText);
                            msg = parsed.message || errorText;
                        } catch(e) {}
                        setLoginErrors({ 'password': msg });
                    } else {
                        setLoginErrors({ 'password': 'Invalid Email or Invalid Password' });
                    }
                } catch(e) {
                    setLoginErrors({ 'password': 'Invalid Email or Invalid Password' });
                }
            }`;

content = content.replace(oldElseBlock, newElseBlock);

fs.writeFileSync(authModalsPath, content, 'utf8');
console.log('Fixed login error message forwarding.');
