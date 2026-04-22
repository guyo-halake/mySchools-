const https = require('https');

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.dDCG60Khw2o3OwksT_rQZ4F9A3vnNpHSKuQWKXet1C4'; // SERVICE KEY

async function checkData(table) {
  const options = {
    hostname: 'vomsaqkhtturzqfuwxsn.supabase.co',
    port: 443,
    path: `/rest/v1/${table}?limit=3`,
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Accept': 'application/json'
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`--- ${table} (Status: ${res.statusCode}) ---`);
        try {
          const json = JSON.parse(data);
          console.log(JSON.stringify(json, null, 2));
        } catch (e) {
          console.log(data);
        }
        resolve();
      });
    });
    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
      resolve();
    });
    req.end();
  });
}

async function run() {
  await checkData('activities');
  await checkData('fees');
}

run();
