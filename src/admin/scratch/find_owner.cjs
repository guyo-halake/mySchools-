const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function findOwner() {
  try {
    await client.connect();
    const res = await client.query("SELECT name, subdomain, email FROM schools WHERE email = 'razakwako45@gmail.com'");
    console.log('OWNER:', JSON.stringify(res.rows));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

findOwner();
