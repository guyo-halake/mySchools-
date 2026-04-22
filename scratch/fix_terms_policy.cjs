const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function fix() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    // Drop the old school-specific policy if it's blocking
    // Actually, just adding a public one is enough since PostgreSQL policies are additive
    await client.query('DROP POLICY IF EXISTS "Public Full Access" ON terms');
    await client.query('CREATE POLICY "Public Full Access" ON terms FOR SELECT USING (true)');
    console.log('Policy created for terms');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

fix();
