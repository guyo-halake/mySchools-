const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function cleanOnboard() {
  try {
    await client.connect();
    
    console.log('--- CLEAN ONBOARDING: Chinga Boys ---');
    
    // 1. Cleanup existing partial records
    await client.query("DELETE FROM schools WHERE subdomain = 'schinga-boys' OR email = 'razakwako45@gmail.com'");
    await client.query("DELETE FROM profiles WHERE email = 'razakwako45@gmail.com'");

    // 2. Insert School
    const schoolRes = await client.query(`
      INSERT INTO schools (name, subdomain, email, location)
      VALUES ('sChinga bOys high school', 'chinga-boys', 'razakwako45@gmail.com', 'Nyeri, Kenya')
      RETURNING id
    `);
    const schoolId = schoolRes.rows[0].id;
    console.log('School Created ID:', schoolId);

    // 3. Insert Admin Profile (Corrected Role)
    const profileRes = await client.query(`
      INSERT INTO profiles (school_id, full_name, email, password, role)
      VALUES ($1, 'Razak Wako', 'razakwako45@gmail.com', 'chinga123', 'ADMIN')
      RETURNING id
    `, [schoolId]);
    console.log('Profile Created ID:', profileRes.rows[0].id);

    console.log('SUCCESS: sChinga bOys high school is now live and fully onboarded.');

  } catch (err) {
    console.error('FAILED:', err.message);
  } finally {
    await client.end();
  }
}

cleanOnboard();
