const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function checkConstraints() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) 
      FROM pg_constraint c 
      JOIN pg_namespace n ON n.oid = c.connamespace 
      WHERE conrelid = 'profiles'::regclass
    `);
    console.log('CONSTRAINTS:', JSON.stringify(res.rows));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkConstraints();
