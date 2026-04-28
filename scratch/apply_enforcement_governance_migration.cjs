const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const c = new Client({ connectionString });
  try {
    await c.connect();
    const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260410_enforcement_governance.sql'), 'utf8');
    await c.query(sql);
    console.log('Enforcement governance migration applied.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
