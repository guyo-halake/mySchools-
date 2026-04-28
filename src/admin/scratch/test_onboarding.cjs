const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function testOnboarding() {
  try {
    await client.connect();
    
    console.log('--- START TEST ONBOARDING ---');
    
    // 1. Create School
    const schoolRes = await client.query(`
      INSERT INTO schools (name, subdomain, email)
      VALUES ('sChinga bOys high school', 'schinga-boys', 'razakwako45@gmail.com')
      RETURNING id
    `);
    const schoolId = schoolRes.rows[0].id;
    console.log('School Created ID:', schoolId);

    // 2. Create Profile
    const profileRes = await client.query(`
      INSERT INTO profiles (school_id, full_name, email, password, role)
      VALUES ($1, 'Razak Wako', 'razakwako45@gmail.com', 'test1234', 'SUPADMIN')
      RETURNING id
    `, [schoolId]);
    console.log('Profile Created ID:', profileRes.rows[0].id);

    console.log('SUCCESS: Onboarding Test Complete.');

  } catch (err) {
    console.error('ERROR DURING TEST:', err.message);
    if (err.detail) console.error('DETAIL:', err.detail);
     if (err.constraint) console.error('CONSTRAINT:', err.constraint);
  } finally {
    await client.end();
  }
}

testOnboarding();
