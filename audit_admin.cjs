const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const pgClient = new Client({ connectionString });

async function check() {
  try {
    await pgClient.connect();
    
    console.log('Querying Root Admin...');
    const email = 'razakwako45@gmail.com';
    const res = await pgClient.query('SELECT * FROM profiles WHERE email = $1', [email]);
    
    if (res.rows.length > 0) {
      console.log('--- ROOT DATA FOUND ---');
      console.log('Email:', res.rows[0].email);
      console.log('Role:', res.rows[0].role);
      console.log('Password in DB:', res.rows[0].password);
    } else {
      console.log('--- ROOT DATA MISSING ---');
      console.log('Checking for any admins...');
      const admins = await pgClient.query('SELECT email FROM profiles WHERE role = \'ADMIN\'');
      console.log('Available Admins:', admins.rows.map(a => a.email));
    }

  } catch (e) {
    console.error('Audit Error:', e.message);
  } finally {
    await pgClient.end();
  }
}

check();
