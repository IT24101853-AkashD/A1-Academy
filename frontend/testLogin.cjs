const http = require('http');

const data = JSON.stringify({
  email: 'deactivated_user@example.com',
  password: 'wrongpassword'
});

const req = http.request('http://localhost:5123/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', body);
  });
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
