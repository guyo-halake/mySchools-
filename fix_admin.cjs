const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const pgClient = new Client({ connectionString });

async function fix() {
  try {
    await pgClient.connect();
    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    
    // Enroll the Root Admin
    const rootEmail = 'razakwako45@gmail.com';
    console.log('Registering root admin:', rootEmail);
    
    await pgClient.query('DELETE FROM profiles WHERE email = $1', [rootEmail]);
    
    await pgClient.query(`
      INSERT INTO profiles (id, school_id, full_name, email, role, password)
      VALUES (gen_random_uuid(), $1, 'Razak Wako', $2, 'ADMIN', 'guyesa10333')
    `, [schoolId, rootEmail]);

    console.log('--- ROOT ADMIN REGISTERED ---');
    console.log('Email:', rootEmail);
    console.log('Pass: guyesa10333');

  } catch (e) {
    console.error('Registration Error:', e.message);
  } finally {
    await pgClient.end();
  }
}

fix();
