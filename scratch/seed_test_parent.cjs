const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vomsaqkhtturzqfuwxsn.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

const SCHOOL_ID = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5'; // Giakanja
const STREAM_ID = '6e5c41d3-701a-4d9d-bef7-d35e2e4fd188'; // Grade 6 West
const PARENT_EMAIL = 'testparent@gmail.com';
const PARENT_PASS = 'password123';

async function seedParent() {
  await client.connect();
  console.log('Connected to Database. Creating Auth User...');

  // 1. Create Auth User (Direct DB Insert to bypass rate limits)
  let authUserId;
  try {
    const res = await client.query('SELECT id FROM auth.users WHERE email = $1', [PARENT_EMAIL]);
    if (res.rows.length > 0) {
      authUserId = res.rows[0].id;
      console.log('User already exists in auth.users, updating password...');
      await client.query(`
        UPDATE auth.users 
        SET encrypted_password = crypt($1, gen_salt('bf')), email_confirmed_at = now(), aud = 'authenticated'
        WHERE id = $2
      `, [PARENT_PASS, authUserId]);
    } else {
      console.log('Inserting directly into auth.users...');
      authUserId = uuidv4();
      await client.query(`
        INSERT INTO auth.users (id, instance_id, aud, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, email_change, email_change_token_new, recovery_token)
        VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', $2, crypt($3, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', '', '', '', '')
      `, [authUserId, PARENT_EMAIL, PARENT_PASS]);
    }
  } catch (err) {
    console.error('Failed to insert auth user directly:', err);
    process.exit(1);
  }

  if (!authUserId) {
    console.error('Failed to resolve auth user ID.');
    process.exit(1);
  }

  console.log(`Auth user resolved: ${authUserId}`);

  // 2. Insert Parent Profile
  console.log('Inserting Parent Profile...');
  await client.query(`
    INSERT INTO profiles (id, full_name, email, role, school_id, phone)
    VALUES ($1, 'Test Parent', $2, 'PARENT', $3, '0700112233')
    ON CONFLICT (id) DO UPDATE SET role = 'PARENT', school_id = $3
  `, [authUserId, PARENT_EMAIL, SCHOOL_ID]);

  // 3. Insert Test Student
  console.log('Inserting Test Student...');
  let studentProfileId;
  const existingStudent = await client.query('SELECT id FROM students WHERE adm_no = $1 AND school_id = $2', ['TST-001', SCHOOL_ID]);
  
  if (existingStudent.rows.length > 0) {
    studentProfileId = existingStudent.rows[0].id;
    console.log('Student already exists, using existing ID:', studentProfileId);
  } else {
    studentProfileId = uuidv4();
    await client.query(`
      INSERT INTO profiles (id, full_name, role, school_id)
      VALUES ($1, 'Test Student', 'STUDENT', $2)
      ON CONFLICT DO NOTHING
    `, [studentProfileId, SCHOOL_ID]);

    await client.query(`
      INSERT INTO students (id, adm_no, parent_id, school_id, stream_id)
      VALUES ($1, 'TST-001', $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET parent_id = $2, stream_id = $4
    `, [studentProfileId, authUserId, SCHOOL_ID, STREAM_ID]);
  }

  console.log('Parent and Student seeded successfully.');

  // 4. Terms
  const termsRes = await client.query('SELECT id, name FROM terms WHERE school_id = $1 ORDER BY start_date DESC LIMIT 3', [SCHOOL_ID]);
  const terms = termsRes.rows;

  // 5. Seed Results (Summative)
  console.log('Seeding Results...');
  const subjectsRes = await client.query('SELECT id, name FROM subjects WHERE school_id = $1 LIMIT 5', [SCHOOL_ID]);
  const subjects = subjectsRes.rows;

  for (const term of terms) {
    // Get/Create an exam for this term
    let examId;
    const examRes = await client.query('SELECT id FROM exams WHERE term_id = $1 LIMIT 1', [term.id]);
    if (examRes.rows.length === 0) {
      const newExamId = uuidv4();
      await client.query(`
        INSERT INTO exams (id, school_id, term_id, name, type, date)
        VALUES ($1, $2, $3, 'End-term', 'SUMMATIVE', NOW())
      `, [newExamId, SCHOOL_ID, term.id]);
      examId = newExamId;
    } else {
      examId = examRes.rows[0].id;
    }

    // Insert results
    for (const sub of subjects) {
      const marks = Math.floor(Math.random() * 40) + 50; // 50 to 90
      await client.query(`
        INSERT INTO exam_results (exam_id, student_id, subject_id, school_id, marks)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [examId, studentProfileId, sub.id, SCHOOL_ID, marks]);
    }
  }

  // 6. Seed CBC Formative
  console.log('Seeding CBC Formative Data...');
  const subStrandsRes = await client.query(`
    SELECT ss.id as sub_id, st.id as strand_id, la.id as area_id
    FROM cbc_sub_strands ss
    JOIN cbc_strands st ON ss.strand_id = st.id
    JOIN learning_areas la ON st.learning_area_id = la.id
    WHERE la.school_id = $1
    LIMIT 10
  `, [SCHOOL_ID]);
  const subStrands = subStrandsRes.rows;

  for (const sub of subStrands) {
    const ratings = ['EE', 'ME', 'AE'];
    const rating = ratings[Math.floor(Math.random() * ratings.length)];
    await client.query(`
      INSERT INTO cbc_student_assessments (school_id, student_id, learning_area_id, strand_id, sub_strand_id, rating, teacher_comment, grade_level_at_time)
      VALUES ($1, $2, $3, $4, $5, $6, 'Actively participating in formative assessments.', 6)
      ON CONFLICT DO NOTHING
    `, [SCHOOL_ID, studentProfileId, sub.area_id, sub.strand_id, sub.sub_id, rating]);
  }

  // Projects
  const areaRes = await client.query('SELECT id FROM learning_areas WHERE school_id = $1 LIMIT 2', [SCHOOL_ID]);
  if (areaRes.rows.length > 0) {
    for (let i = 0; i < areaRes.rows.length; i++) {
      const projId = uuidv4();
      await client.query(`
        INSERT INTO cbc_projects (id, school_id, term_id, learning_area_id, title, description, deadline)
        VALUES ($1, $2, $3, $4, 'Formative Project ${i+1}', 'CBC Portfolio Evidence', NOW())
      `, [projId, SCHOOL_ID, terms[0].id, areaRes.rows[i].id]);
      
      await client.query(`
        INSERT INTO cbc_project_submissions (project_id, student_id, rubric_rating, teacher_comment)
        VALUES ($1, $2, 'ME', 'Excellent portfolio collection.')
        ON CONFLICT DO NOTHING
      `, [projId, studentProfileId]);
    }
  }

  // 7. Seed Fees
  console.log('Seeding Fees...');
  const feeTypes = ['Tuition Fee', 'Boarding Fee', 'Transport Levy'];
  for (let i=0; i<terms.length; i++) {
    const term = terms[i];
    for (const fType of feeTypes) {
      const due = Math.floor(Math.random() * 5000) + 2000;
      // Term 0 (current) partially paid, others fully paid
      const paid = i === 0 && fType === 'Tuition Fee' ? Math.floor(due / 2) : due;
      
      await client.query(`
        INSERT INTO fees (school_id, student_id, term_id, amount_due, amount_paid, type, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [SCHOOL_ID, studentProfileId, term.id, due, paid, fType, paid < due ? 'PARTIAL' : 'PAID']);
    }
  }

  // 8. Seed Digital Diary (Discipline)
  console.log('Seeding Digital Diary...');
  await client.query(`
    INSERT INTO disciplinary_records (school_id, student_id, incident_title, incident_date, action_taken, status, description, reported_by)
    VALUES 
      ($1, $2, 'Excellent Leadership', NOW() - INTERVAL '5 days', 'Commendation', 'RESOLVED', 'Student demonstrated excellent leadership during the group project.', NULL),
      ($1, $2, 'Incomplete Assignment', NOW() - INTERVAL '2 days', 'Teacher Warning', 'OPEN', 'Did not submit the science homework on time.', NULL),
      ($1, $2, 'Active Participation', NOW() - INTERVAL '1 day', 'Positive Reinforcement', 'RESOLVED', 'Very active in class discussions today.', NULL)
  `, [SCHOOL_ID, studentProfileId]);

  console.log('All Seeding Completed Successfully for testparent@gmail.com!');
  await client.end();
}

seedParent().catch(err => {
  console.error('Script Error:', err);
  process.exit(1);
});
