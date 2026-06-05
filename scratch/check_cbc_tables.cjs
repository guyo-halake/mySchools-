const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function checkTables() {
  try {
    await client.connect();
    const res = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE tablename LIKE 'cbc_%'");
    console.log('CBC Tables:', res.rows.map(r => r.tablename));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkTables();
