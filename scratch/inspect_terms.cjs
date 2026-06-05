const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const GIAKANJA_ID = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query('SELECT id, name, is_current, school_id FROM terms WHERE school_id = $1', [GIAKANJA_ID]);
  console.log('Terms found:', res.rows);
  await client.end();
}

main().catch(console.error);
