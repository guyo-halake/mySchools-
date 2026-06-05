const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function addStudent() {
  try {
    await client.connect();
    console.log('Connected to Database...');

    // 1. Get School
    const schoolRes = await client.query('SELECT id FROM schools LIMIT 1');
    if (schoolRes.rows.length === 0) throw new Error('No school found');
    const schoolId = schoolRes.rows[0].id;

    // 2. Get Grade 6 West Stream
    const streamRes = await client.query(`
      SELECT s.id 
      FROM streams s
      JOIN classes c ON s.class_id = c.id
      WHERE s.name = 'West' AND c.name = 'Grade 6'
      LIMIT 1
    `);
    if (streamRes.rows.length === 0) throw new Error('Grade 6 West stream not found');
    const streamId = streamRes.rows[0].id;

    // 3. Find or Create Profile
    let profileId;
    const checkRes = await client.query("SELECT id FROM profiles WHERE full_name = 'Razanyoo' OR email = 'guyohalakeofficial@gmail.com' LIMIT 1");
    
    if (checkRes.rows.length > 0) {
      profileId = checkRes.rows[0].id;
      console.log('Using existing profile:', profileId);
    } else {
      console.log('Creating Profile for Razanyoo...');
      const insertRes = await client.query(`
        INSERT INTO profiles (full_name, role, email)
        VALUES ('Razanyoo', 'STUDENT', 'guyohalakeofficial@gmail.com')
        RETURNING id
      `);
      profileId = insertRes.rows[0].id;
    }

    // 4. Create Student
    console.log('Creating Student record...');
    await client.query(`
      INSERT INTO students (id, school_id, stream_id, adm_no)
      VALUES ($1, $2, $3, 'RAZ-2026-001')
      ON CONFLICT (id) DO NOTHING
    `, [profileId, schoolId, streamId]);

    console.log('Successfully added Razanyoo to Grade 6 West!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

addStudent();
