const https = require('https');

const options = {
  hostname: 'vomsaqkhtturzqfuwxsn.supabase.co',
  port: 443,
  path: '/rest/v1/fees?select=count&type=eq.School system fees',
  method: 'GET',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8',
    'Range': '0-0',
    'Prefer': 'count=exact'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  console.log('--- FEE COUNT CHECK ---');
  console.log('Status Header:', res.headers['content-range']);
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Data:', data);
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();
