const https = require('https');

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.dDCG60Khw2o3OwksT_rQZ4F9A3vnNpHSKuQWKXet1C4';

const options = {
  hostname: 'vomsaqkhtturzqfuwxsn.supabase.co',
  port: 443,
  path: '/rest/v1/activities?limit=1', // Check columns by fetching one record
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('--- ACTIVITIES RECORD ---');
    if (data) {
       console.log(data);
       try {
         const rows = JSON.parse(data);
         if (rows.length > 0) console.log(Object.keys(rows[0]));
       } catch (e) {}
    }
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();
