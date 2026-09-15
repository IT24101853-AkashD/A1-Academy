const fs = require('fs');
const path = require('path');

const authModalsPath = path.join(__dirname, 'src', 'components', 'AuthModals.jsx');
let content = fs.readFileSync(authModalsPath, 'utf8');

const regex = /} else \{\s*setLoginErrors\(\{ 'password': 'Invalid Email or Invalid Password' \}\);\s*}/;

const newElseBlock = `} else {
                try {
                    const errorText = await res.text();
                    if (errorText) {
                        let msg = errorText;
                        try { 
                            const parsed = JSON.parse(errorText);
                            msg = parsed.message || errorText;
                        } catch(e) {}
                        
                        // If the API returns ProblemDetails, it has a "detail" field
                        try {
                            const parsed = JSON.parse(errorText);
                            if (parsed.detail) msg = parsed.detail;
                        } catch (e) {}

                        setLoginErrors({ 'password': msg });
                    } else {
                        setLoginErrors({ 'password': 'Invalid Email or Invalid Password' });
                    }
                } catch(e) {
                    setLoginErrors({ 'password': 'Invalid Email or Invalid Password' });
                }
            }`;

if (regex.test(content)) {
    content = content.replace(regex, newElseBlock);
    fs.writeFileSync(authModalsPath, content, 'utf8');
    console.log('Fixed login error message forwarding successfully.');
} else {
    console.log('Regex did not match.');
}
