const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query('SELECT id, email FROM auth.users');
  console.log('Auth Users list:', res.rows);
  await client.end();
}

main().catch(console.error);
