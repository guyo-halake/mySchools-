const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function fullOperationalTest() {
  try {
    await pgClient.connect();
    console.log('--- STARTING COMPREHENSIVE OPERATIONAL TEST ---');

    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    
    // 1. SELECT ENTITIES
    const teacherRes = await pgClient.query("SELECT id FROM profiles WHERE role = 'TEACHER' LIMIT 1");
    const teacherId = teacherRes.rows[0].id;
    const studentRes = await pgClient.query("SELECT id, stream_id FROM students WHERE school_id = $1 LIMIT 1", [schoolId]);
    const studentId = studentRes.rows[0].id;
    const streamId = studentRes.rows[0].stream_id;
    const subjectRes = await pgClient.query("SELECT id FROM subjects WHERE school_id = $1 LIMIT 1", [schoolId]);
    const subjectId = subjectRes.rows[0].id;
    const termRes = await pgClient.query("SELECT id FROM terms WHERE school_id = $1 AND name = 'Term 1 2026' LIMIT 1", [schoolId]);
    const termId = termRes.rows[0].id;

    console.log(`Teacher: ${teacherId}`);
    console.log(`Student: ${studentId}`);
    console.log(`Subject: ${subjectId}`);
    console.log(`Stream:  ${streamId}`);

    // 2. ASSIGN TEACHER SCOPE (Crucial for passing governance)
    console.log('Assigning Teacher Scope...');
    await pgClient.query(`
      INSERT INTO teacher_subject_stream_assignments (school_id, teacher_id, subject_id, stream_id, active)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT DO NOTHING
    `, [schoolId, teacherId, subjectId, streamId]);

    // 3. OPEN EXAM WINDOW
    console.log('Opening Exam Window...');
    await pgClient.query(`
      INSERT INTO exam_windows (school_id, term_id, exam_type, name, is_open, is_current)
      VALUES ($1, $2, 'MID_TERM', 'Mid-Term 1 Test', TRUE, TRUE)
      ON CONFLICT (school_id, term_id, exam_type) DO UPDATE SET is_open = TRUE, is_current = TRUE
    `, [schoolId, termId]);

    await pgClient.query(`
      INSERT INTO school_result_controls (school_id, active_term_id, enforce_exam_window, enforce_teacher_scope)
      VALUES ($1, $2, TRUE, TRUE)
      ON CONFLICT (school_id) DO UPDATE SET active_term_id = $2, enforce_exam_window = TRUE, enforce_teacher_scope = TRUE
    `, [schoolId, termId]);

    // 4. TEST RESULT ENTRY
    console.log('Creating Result Workflow Entry...');
    const workflowId = crypto.randomUUID();
    await pgClient.query(`
      INSERT INTO results_workflow (
        id, school_id, student_id, subject_id, term_id, exam_type, exam_name, 
        marks, grade, status, submitted_by
      ) VALUES (
        $1, $2, $3, $4, $5, 'MID_TERM', 'Mid-Term 1 Test', 
        88, 'A', 'DRAFT', $6
      )
    `, [workflowId, schoolId, studentId, subjectId, termId, teacherId]);
    console.log('Workflow Entry Created Successfully!');

    // 5. TEST TIMETABLE LIVE SESSION
    console.log('Creating Live Timetable Entry...');
    await pgClient.query(`
      INSERT INTO live_timetable_entries (
        school_id, teacher_id, entry_type, template_key, 
        day_of_week, start_at, end_at, subject_id, stream_id, status
      ) VALUES (
        $1, $2, 'LIVE', 'TIMETABLE_CLASSES',
        'Monday', '2026-01-05T08:00:00Z', '2026-01-05T08:45:00Z', $3, $4, 'SCHEDULED'
      )
    `, [schoolId, teacherId, subjectId, streamId]);
    console.log('Live Timetable Entry Created Successfully!');

    console.log('--- ALL OPERATIONAL TESTS PASSED ---');

  } catch (e) {
    console.error('Test Failed:', e.message);
    if (e.detail) console.error('Detail:', e.detail);
  } finally {
    await pgClient.end();
  }
}

fullOperationalTest();
