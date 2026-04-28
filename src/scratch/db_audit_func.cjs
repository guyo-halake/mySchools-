const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const r = await client.query("SELECT routine_definition FROM information_schema.routines WHERE routine_name = 'calculate_grade_from_mark'");
    console.log('calculate_grade_from_mark Definition:');
    console.log(r.rows[0]?.routine_definition);
  } finally {
    await client.end();
  }
}

audit();
