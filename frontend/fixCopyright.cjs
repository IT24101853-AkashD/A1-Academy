const fs = require('fs');
const path = require('path');

const authPath = path.join(__dirname, '..', 'backend', 'A1Academy.API', 'Controllers', 'AuthController.cs');
let authContent = fs.readFileSync(authPath, 'utf8');
authContent = authContent.replace(/Â©/g, '&copy;');
fs.writeFileSync(authPath, authContent, 'utf8');

const usersPath = path.join(__dirname, '..', 'backend', 'A1Academy.API', 'Controllers', 'UsersController.cs');
let usersContent = fs.readFileSync(usersPath, 'utf8');
usersContent = usersContent.replace(/Â©/g, '&copy;');
fs.writeFileSync(usersPath, usersContent, 'utf8');

console.log('Fixed copyright symbols.');
