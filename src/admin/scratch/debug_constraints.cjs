const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function debugConstraint() {
  try {
    await client.connect();
    
    console.log('--- SCHOOLS ---');
    const schools = await client.query("SELECT name, subdomain FROM schools");
    console.log(JSON.stringify(schools.rows));

    console.log('--- PROFILES ---');
    const profiles = await client.query("SELECT email FROM profiles");
    console.log(JSON.stringify(profiles.rows));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

debugConstraint();
