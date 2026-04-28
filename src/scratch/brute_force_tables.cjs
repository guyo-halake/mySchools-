const https = require('https');

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.dDCG60Khw2o3OwksT_rQZ4F9A3vnNpHSKuQWKXet1C4'; // SERVICE KEY

const tables = [
  'announcements', 'messages', 'activities', 'notifications', 
  'in_app_notifications', 'alerts', 'logs', 'audit_logs', 
  'student_notifications', 'user_notifications'
];

async function bruteForce() {
  console.log('--- BRUTE FORCE TABLE CHECK (SERVICE ROLE) ---');
  for (const t of tables) {
    const options = {
      hostname: 'vomsaqkhtturzqfuwxsn.supabase.co',
      port: 443,
      path: `/rest/v1/${t}?limit=1`,
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    };
    await new Promise(resolve => {
      const req = https.request(options, (res) => {
        console.log(`${t}: ${res.statusCode}`);
        resolve();
      });
      req.end();
    });
  }
}

bruteForce();
