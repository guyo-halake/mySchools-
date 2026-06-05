const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  await client.connect();
  console.log('Connected to PG Database...');

  const res = await client.query("SELECT * FROM learning_areas LIMIT 1");
  console.log('Sample learning area row:');
  console.log(res.rows[0]);

  const res2 = await client.query("SELECT * FROM subjects LIMIT 1");
  console.log('Sample subject row:');
  console.log(res2.rows[0]);

  await client.end();
}

main().catch(console.error);
