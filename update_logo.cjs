const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });
async function update() {
  await client.connect();
  await client.query("UPDATE schools SET logo_url = '/giakanja_logo.png' WHERE subdomain = 'giakanja'");
  console.log('Database updated successfully!');
  await client.end();
}
update();
