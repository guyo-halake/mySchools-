const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20260413_live_session_enhancements.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('Live session enhancements migration applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
