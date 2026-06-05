const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const GIAKANJA_ID = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  
  const res = await client.query(`
    SELECT id, email, full_name, role, school_id, password
    FROM public.profiles 
    WHERE school_id = $1 OR email LIKE '%principal%' OR email LIKE '%rachi%'
  `, [GIAKANJA_ID]);
  console.log('Profiles found:', res.rows);
  
  await client.end();
}

main().catch(console.error);
