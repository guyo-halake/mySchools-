const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function checkTriggers() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT tgname 
      FROM pg_trigger 
      WHERE tgrelid = 'profiles'::regclass
    `);
    console.log('TRIGGERS:', JSON.stringify(res.rows));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkTriggers();
