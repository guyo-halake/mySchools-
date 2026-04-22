const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function seedFixed() {
  try {
    await client.connect();
    
    console.log('--- ATTEMPTING LIVE SEED: Chinga Boys ---');
    
    // 1. Check if school exists
    const checkS = await client.query("SELECT id FROM schools WHERE subdomain = 'chinga-boys'");
    if (checkS.rows.length > 0) {
      console.log('School exists. Updating basic info and continuing...');
      var schoolId = checkS.rows[0].id;
    } else {
      const insS = await client.query(`
        INSERT INTO schools (name, subdomain, email, location)
        VALUES ('sChinga bOys high school', 'chinga-boys', 'razakwako45@gmail.com', 'Nyeri, Kenya')
        RETURNING id
      `);
      var schoolId = insS.rows[0].id;
      console.log('Created School ID:', schoolId);
    }

    // 2. Check if Admin Profile exists
    const checkP = await client.query("SELECT id FROM profiles WHERE email = 'razakwako45@gmail.com' AND school_id = $1", [schoolId]);
    if (checkP.rows.length === 0) {
      const insP = await client.query(`
        INSERT INTO profiles (school_id, full_name, email, password, role)
        VALUES ($1, 'Razak Wako', 'razakwako45@gmail.com', 'chinga123', 'ADMIN')
        RETURNING id
      `, [schoolId]);
      console.log('Created Profile ID:', insP.rows[0].id);
    } else {
      console.log('Admin profile already exists for this school.');
    }

    console.log('SUCCESS: sChinga bOys high school is verified live in your system.');

  } catch (err) {
    console.error('SEED FAILED:', err.message);
  } finally {
    await client.end();
  }
}

seedFixed();
