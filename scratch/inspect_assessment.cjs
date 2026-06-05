const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  await client.connect();
  console.log('Connected to PG Database...');

  const res = await client.query("SELECT * FROM cbc_student_assessments LIMIT 2");
  console.log('cbc_student_assessments sample rows:');
  console.log(res.rows);

  await client.end();
}

main().catch(console.error);
