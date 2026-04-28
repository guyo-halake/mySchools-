const https = require('https');

const options = {
  hostname: 'vomsaqkhtturzqfuwxsn.supabase.co',
  port: 443,
  path: '/rest/v1/rpc/get_tables', // I'll try if there is an RPC, but more likely I'll just check common names
  method: 'GET',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8'
  }
};

// Since I can't easily query information_schema via REST, I'll check common names mentioned in API or files.
// Earlier I saw: announcements, messages?
// Let's check 'announcements' and 'messages' and 'activities' and 'alerts'

async function checkTables() {
  const tables = ['announcements', 'messages', 'chat_messages', 'notifications', 'school_events', 'activities'];
  console.log('--- CHECKING EXISTING TABLES ---');
  for (const t of tables) {
    const opt = { ...options, path: `/rest/v1/${t}?select=count` };
    await new Promise(resolve => {
      const req = https.request(opt, (res) => {
        console.log(`${t}: ${res.statusCode}`);
        resolve();
      });
      req.end();
    });
  }
}

checkTables();
