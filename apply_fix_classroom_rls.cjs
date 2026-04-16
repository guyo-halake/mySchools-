const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function applyMigration() {
  const client = new Client({ connectionString });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected!');

    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260416_fix_classroom_rls_policies.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying RLS fix migration...');
    await client.query(sql);
    console.log('✅ Migration applied successfully!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
