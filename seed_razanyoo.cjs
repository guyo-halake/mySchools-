const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const pgClient = new Client({ connectionString });

const KENYAN_NAMES = [
  'Kamau', 'Wanjiku', 'Hassan', 'Otieno', 'Odhiambo', 'Akinyi', 'Kipchumba', 'Chebet',
  'Nyambura', 'Ndungu', 'Mutua', 'Mutuku', 'Njeri', 'Muthoni', 'Ochieng', 'Omondi'
];

async function seed() {
  try {
    await pgClient.connect();
    console.log('Connected to DB');

    // 1. Get/Create School
    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    await pgClient.query(`
      INSERT INTO schools (id, name, subdomain, email, location, phone_numbers)
      VALUES ($1, 'Giakanja Boys High School', 'giakanja', 'principal@giakanja.co.ke', 'Nyeri', '{"072200000"}')
      ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name
    `, [schoolId]);

    // 2. Add Subjects
    const subjects = [
      { id: crypto.randomUUID(), name: 'Mathematics', is_compulsory: true },
      { id: crypto.randomUUID(), name: 'English', is_compulsory: true },
      { id: crypto.randomUUID(), name: 'Physics', is_compulsory: false },
      { id: crypto.randomUUID(), name: 'Chemistry', is_compulsory: true },
      { id: crypto.randomUUID(), name: 'Geography', is_compulsory: false }
    ];
    for (const s of subjects) {
      await pgClient.query(`INSERT INTO subjects (id, school_id, name, is_compulsory) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [s.id, schoolId, s.name, s.is_compulsory]);
    }

    // 3. Create a Stream
    const clsId = crypto.randomUUID();
    await pgClient.query(`INSERT INTO classes (id, school_id, name, level) VALUES ($1, $2, 'Form 4', 4) ON CONFLICT DO NOTHING`, [clsId, schoolId]);
    const streamId = crypto.randomUUID();
    await pgClient.query(`INSERT INTO streams (id, school_id, class_id, name) VALUES ($1, $2, $3, 'G') ON CONFLICT DO NOTHING`, [streamId, schoolId, clsId]);

    // 4. ADD RAZANYOO
    const razanId = crypto.randomUUID();
    console.log(`Enrolling Razanyoo with ID: ${razanId}`);
    
    await pgClient.query(`
      INSERT INTO profiles (id, school_id, full_name, email, role, password)
      VALUES ($1, $2, 'Razanyoo', 'razan@giakanja.co.ke', 'STUDENT', 'password123')
      ON CONFLICT DO NOTHING
    `, [razanId, schoolId]);

    await pgClient.query(`
      INSERT INTO students (id, school_id, adm_no, stream_id)
      VALUES ($1, $2, 'GHS-8800', $3)
      ON CONFLICT DO NOTHING
    `, [razanId, schoolId, streamId]);

    // 5. ENROLL RAZANYOO IN SUBJECTS
    for (const s of subjects) {
      await pgClient.query(`INSERT INTO student_subjects (student_id, subject_id, school_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [razanId, s.id, schoolId]);
    }

    // 6. ADD ACADEMIC RESULTS
    const examId = crypto.randomUUID();
    await pgClient.query(`INSERT INTO exams (id, school_id, name, term_id, year, type) VALUES ($1, $2, 'Term 1 End Exam', 'Term 1', 2024, 'End-Term')`, [examId, schoolId]);
    
    await pgClient.query(`
      INSERT INTO exam_results (id, student_id, school_id, subject_id, exam_id, marks, grade)
      VALUES ($1, $2, $3, $4, $5, 84, 'A')
    `, [crypto.randomUUID(), razanId, schoolId, subjects[0].id, examId]); // Math

    await pgClient.query(`
      INSERT INTO exam_results (id, student_id, school_id, subject_id, exam_id, marks, grade)
      VALUES ($1, $2, $3, $4, $5, 76, 'A-')
    `, [crypto.randomUUID(), razanId, schoolId, subjects[2].id, examId]); // Physics

    // 7. ADD DISCIPLINARY RECORD
    await pgClient.query(`
      INSERT INTO disciplinary_records (student_id, school_id, incident_date, incident_title, description, motive, reported_by, action_taken)
      VALUES ($1, $2, '2024-03-15', 'Mobile Phone Possession', 'Found with a smartphone during night prep.', 'Communication with home', 'Mr. Kamau (Prefect)', '1 Week Suspension')
    `, [razanId, schoolId]);

    // 8. ADD HEALTH RECORD
    await pgClient.query(`
      INSERT INTO student_health (student_id, blood_group, allergies, chronic_conditions)
      VALUES ($1, 'O+', 'None', 'None')
    `, [razanId]);

    console.log('Seeding complete! Razanyoo is now a student with results and history.');

  } catch (e) {
    console.error('Error seeding:', e);
  } finally {
    await pgClient.end();
  }
}

seed();
