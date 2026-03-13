const https = require('https');

https.get('https://site-six-gules-73.vercel.app/', (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    if (res.statusCode >= 500) {
      console.log('Body:', data.substring(0, 1000));
    }
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});
