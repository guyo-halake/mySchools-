const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const pgClient = new Client({ connectionString });

async function seed() {
  try {
    await pgClient.connect();
    console.log('Connected to DB');

    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    
    // 1. Get or Create Razanyoo
    // We search first to avoid duplicates
    const res = await pgClient.query('SELECT id FROM profiles WHERE full_name = \'Razanyoo\'');
    let razanId;
    if (res.rows.length > 0) {
      razanId = res.rows[0].id;
    } else {
      razanId = crypto.randomUUID();
      await pgClient.query(`INSERT INTO profiles (id, school_id, full_name, email, role, password) VALUES ($1, $2, 'Razanyoo', 'razan@giakanja.co.ke', 'STUDENT', 'password123')`, [razanId, schoolId]);
      await pgClient.query(`INSERT INTO students (id, school_id, adm_no, stream_id) VALUES ($1, $2, 'GHS-8800', (SELECT id FROM streams WHERE school_id = $2 LIMIT 1))`, [razanId, schoolId]);
    }

    // 2. Clear old records for a clean seed (for this student only)
    await pgClient.query('DELETE FROM student_subjects WHERE student_id = $1', [razanId]);
    await pgClient.query('DELETE FROM student_health WHERE student_id = $1', [razanId]);
    await pgClient.query('DELETE FROM disciplinary_records WHERE student_id = $1', [razanId]);
    await pgClient.query('DELETE FROM student_activities WHERE student_id = $1', [razanId]);

    // 3. Add Subjects (The Full 9-Subject Suite)
    const subNames = ['Mathematics', 'English', 'Kiswahili', 'Chemistry', 'Physics', 'CRE', 'Business Studies', 'History', 'Government'];
    for (const name of subNames) {
      const subRes = await pgClient.query('INSERT INTO subjects (id, school_id, name, is_compulsory) VALUES ($1, $2, $3, true) ON CONFLICT (school_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id', [crypto.randomUUID(), schoolId, name]);
      await pgClient.query('INSERT INTO student_subjects (student_id, subject_id, school_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [razanId, subRes.rows[0].id, schoolId]);
    }

    // 4. Add Disciplinary Record
    await pgClient.query(`
      INSERT INTO disciplinary_records (student_id, school_id, incident_date, incident_title, description, action_taken)
      VALUES ($1, $2, '2026-03-13', 'Mobile Phone Possession', 'Found with a phone in the dormitory.', '2 Weeks Suspension')
    `, [razanId, schoolId]);

    // 5. Add Health Record
    await pgClient.query(`
      INSERT INTO student_health (student_id, blood_group, emergency_notes)
      VALUES ($1, 'Unknown', 'Eye problem - Wears glasses for vision assistance.')
    `, [razanId]);

    // 6. Add Activity
    const activityId = crypto.randomUUID();
    await pgClient.query(`INSERT INTO activities (id, school_id, name, category) VALUES ($1, $2, 'Basketball', 'SPORT') ON CONFLICT DO NOTHING`, [activityId, schoolId]);
    await pgClient.query(`INSERT INTO student_activities (student_id, activity_id) VALUES ($1, (SELECT id FROM activities WHERE name = 'Basketball' LIMIT 1)) ON CONFLICT DO NOTHING`, [razanId]);

    // 7. Fees (Simplified balance tracking for now)
    await pgClient.query(`UPDATE students SET stream_id = stream_id WHERE id = $1`, [razanId]); // Just a touch to trigger updates if needed

    console.log('Razanyoo dossier seeded successfully with 9 subjects and full history.');

  } catch (e) {
    console.error('Seed Error:', e.message);
  } finally {
    await pgClient.end();
  }
}

seed();
