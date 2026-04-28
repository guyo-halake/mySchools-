const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });
async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT conname, relname 
    FROM pg_constraint c 
    JOIN pg_class r ON c.conrelid = r.oid 
    WHERE contype = 'f' AND relname IN ('students', 'streams')
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
check();
