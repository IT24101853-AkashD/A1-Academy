const fs = require('fs');
const file = 'frontend/index.html';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
    /<link rel="icon" type="image\/[^"]+" href="\/[^"]+" \/>/g,
    '<link rel="icon" type="image/svg+xml" href="/vite.svg" />'
);
fs.writeFileSync(file, content);
console.log('Favicon reverted.');
