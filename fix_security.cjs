const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const pgClient = new Client({ connectionString });

async function fix() {
  try {
    await pgClient.connect();
    
    console.log('Clearing old security blocks...');
    await pgClient.query('DROP POLICY IF EXISTS "Allow public read for login" ON profiles');
    
    console.log('Authorizing general login access...');
    await pgClient.query('CREATE POLICY "Allow public read for login" ON profiles FOR SELECT USING (true)');

    console.log('--- SECURITY GATE OPENED ---');
    console.log('You can now log in with razakwako45@gmail.com');

  } catch (e) {
    console.error('Security Patch Error:', e.message);
  } finally {
    await pgClient.end();
  }
}

fix();
