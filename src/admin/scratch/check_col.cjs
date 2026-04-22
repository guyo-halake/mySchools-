const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function checkCol() {
  try {
    await client.connect();
    const res = await client.query("SELECT column_name, column_default FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'id'");
    console.log('COL_DEF:', JSON.stringify(res.rows));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkCol();
