const fs = require('fs');
const path = require('path');

const authModalsPath = path.join(__dirname, 'src', 'components', 'AuthModals.jsx');
let content = fs.readFileSync(authModalsPath, 'utf8');

// The start and end markers of the broken injection
const injectStart = '\n{/* ADMIN CONTROLS MODAL POPUP */}';
const injectEndStr = '</div>\n</>';

const startIndex = content.indexOf(injectStart);
if (startIndex !== -1) {
    const endIndex = content.indexOf(injectEndStr, startIndex) + injectEndStr.length;
    
    const extractedModalHtml = content.substring(startIndex, endIndex - 4); // minus '\n</>'
    
    // Remove the bad injection and restore the original </>
    content = content.substring(0, startIndex) + '</>' + content.substring(endIndex);
    
    // Find the LAST </>
    const lastTagIndex = content.lastIndexOf('</>');
    if (lastTagIndex !== -1) {
        content = content.substring(0, lastTagIndex) + extractedModalHtml + '\n</>' + content.substring(lastTagIndex + 3);
    }
    
    fs.writeFileSync(authModalsPath, content, 'utf8');
    console.log('Fixed AuthModals successfully.');
} else {
    console.log('Could not find injection start.');
}
