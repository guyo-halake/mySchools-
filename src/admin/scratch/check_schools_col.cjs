const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function checkSchoolsCol() {
  try {
    await client.connect();
    const res = await client.query("SELECT column_name, column_default FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'id'");
    console.log('SCHOOL_COL_DEF:', JSON.stringify(res.rows));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkSchoolsCol();
