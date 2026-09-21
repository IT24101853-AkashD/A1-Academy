const http = require('https');

const req = http.request('https://a1academy-gateway.wittymushroom-94d43ea8.southeastasia.azurecontainerapps.io/api/auth/login', {
    method: 'OPTIONS',
    headers: {
        'Origin': 'https://a1-academy-frontend.azurewebsites.net',
        'Access-Control-Request-Method': 'POST'
    }
}, (res) => {
    console.log('OPTIONS STATUS:', res.statusCode);
    console.log('OPTIONS HEADERS:', res.headers);
});
req.on('error', console.error);
req.end();

const req2 = http.request('https://a1academy-gateway.wittymushroom-94d43ea8.southeastasia.azurecontainerapps.io/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
}, (res) => {
    console.log('POST STATUS:', res.statusCode);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('POST BODY:', data));
});
req2.on('error', console.error);
req2.write(JSON.stringify({ email: 'admin@a1academy.com', password: 'AdminPassword123!' }));
req2.end();
