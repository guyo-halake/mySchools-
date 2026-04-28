const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Use the connection string from db_audit_gs_full.cjs or .env
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function applyMigration() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const sqlPath = path.join(__dirname, '..', 'admin', 'migrations', 'support_logs.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Applying migration...');
    await client.query(sql);
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

applyMigration();
