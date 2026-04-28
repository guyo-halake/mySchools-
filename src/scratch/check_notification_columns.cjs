const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkColumns() {
  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'in_app_notifications'");
  console.log('Columns in in_app_notifications:', res.rows.map(r => r.column_name));
  await client.end();
}

checkColumns();
