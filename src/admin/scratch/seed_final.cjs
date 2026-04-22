const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function seedFinal() {
  try {
    await client.connect();
    
    console.log('--- FINAL SEED: Chinga Boys ---');
    
    // 1. Cleanup
    await client.query("DELETE FROM schools WHERE subdomain = 'chinga-boys'");

    // 2. Insert School
    const schoolRes = await client.query(`
      INSERT INTO schools (name, subdomain, email, location)
      VALUES ('sChinga bOys high school', 'chinga-boys', 'razakwako45@gmail.com', 'Nyeri, Kenya')
      RETURNING id
    `);
    const schoolId = schoolRes.rows[0].id;
    console.log('Created School ID:', schoolId);

    // 3. Insert Admin Profile (MANUAL UUID)
    const profileId = uuidv4();
    await client.query(`
      INSERT INTO profiles (id, school_id, full_name, email, password, role)
      VALUES ($1, $2, 'Razak Wako', 'razakwako45@gmail.com', 'chinga123', 'ADMIN')
    `, [profileId, schoolId]);
    console.log('Created Profile ID:', profileId);

    console.log('SUCCESS: sChinga bOys high school is now live in your database.');

  } catch (err) {
    console.error('FAILED:', err.message);
  } finally {
    await client.end();
  }
}

seedFinal();
