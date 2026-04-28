const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260415_apply_calendar_template_rpc.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('Applied apply_calendar_template RPC migration successfully.');
  } catch (err) {
    console.error('Failed to apply migration:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
