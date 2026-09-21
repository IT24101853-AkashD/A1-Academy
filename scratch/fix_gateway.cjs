const fs = require('fs');
const path = require('path');

// 1. Fix Program.cs CORS
const progPath = path.join(__dirname, '../backend/A1Academy.Gateway/Program.cs');
let prog = fs.readFileSync(progPath, 'utf8');
prog = prog.replace('.WithOrigins("http://localhost:5173", "http://localhost:4173")\n              .AllowAnyHeader()\n              .AllowAnyMethod()\n              .AllowCredentials();', '.AllowAnyOrigin()\n              .AllowAnyHeader()\n              .AllowAnyMethod();');
fs.writeFileSync(progPath, prog);

// 2. Fix appsettings.json routes
const appSetPath = path.join(__dirname, '../backend/A1Academy.Gateway/appsettings.json');
let appSet = fs.readFileSync(appSetPath, 'utf8');
appSet = appSet.replace('http://localhost:5101/', 'http://a1academy-auth/');
appSet = appSet.replace('http://localhost:5102/', 'http://a1academy-admin/');
appSet = appSet.replace('http://localhost:5103/', 'http://a1academy-teacher/');
fs.writeFileSync(appSetPath, appSet);

console.log('Fixed Gateway CORS and Routing.');
