const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query("SELECT id, email, role, school_id, password FROM public.profiles WHERE email = 'principal.rachi@giakanja.co.ke'");
  console.log('Principal profiles matching:', res.rows);
  await client.end();
}

main().catch(console.error);
