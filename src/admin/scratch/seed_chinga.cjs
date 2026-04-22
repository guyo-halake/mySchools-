const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function seedChinga() {
  try {
    await client.connect();
    
    // Check if school already exists to avoid subdomain error
    const checkRes = await client.query("SELECT id FROM schools WHERE subdomain = 'chinga-boys'");
    if (checkRes.rows.length > 0) {
      console.log('Chinga Boys already exists. Deleting to re-seed...');
      await client.query("DELETE FROM schools WHERE subdomain = 'chinga-boys'");
    }

    // 1. Create School
    const schoolRes = await client.query(`
      INSERT INTO schools (name, subdomain, email, location)
      VALUES ('sChinga bOys high school', 'chinga-boys', 'razakwako45@gmail.com', 'Nyeri, Kenya')
      RETURNING id
    `);
    const schoolId = schoolRes.rows[0].id;

    // 2. Create Admin Profile
    await client.query(`
      INSERT INTO profiles (school_id, full_name, email, password, role)
      VALUES ($1, 'Razak Wako', 'razakwako45@gmail.com', 'chinga123', 'ADMIN')
    `, [schoolId]);

    console.log('SUCCESS: sChinga bOys high school onboarded live.');

  } catch (err) {
    console.error('SEED ERROR:', err.message);
  } finally {
    await client.end();
  }
}

seedChinga();
