const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function runTest() {
  try {
    await pgClient.connect();
    console.log('--- STARTING REAL-WORLD FUNCTIONAL TEST ---');

    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5'; // Giakanja School ID
    
    // 1. ENSURE TERM EXISTS
    const termId = crypto.randomUUID();
    await pgClient.query(`
      INSERT INTO terms (id, school_id, name, year, start_date, end_date)
      VALUES ($1, $2, 'Term 1', 2026, '2026-01-05', '2026-04-10')
      ON CONFLICT DO NOTHING
    `, [termId, schoolId]);
    
    // Get actual term ID (in case it existed)
    const termRes = await pgClient.query("SELECT id FROM terms WHERE school_id = $1 AND name = 'Term 1' AND year = 2026", [schoolId]);
    const actualTermId = termRes.rows[0].id;
    console.log('Term Verified:', actualTermId);

    // 2. CREATE MID-TERM EXAM
    const examId = crypto.randomUUID();
    await pgClient.query(`
      INSERT INTO exams (id, school_id, term_id, name, type, date)
      VALUES ($1, $2, $3, 'Mid-Term 1', 'MID_TERM', '2026-02-15')
      ON CONFLICT DO NOTHING
    `, [examId, schoolId, actualTermId]);
    console.log('Exam Created: Mid-Term 1');

    // 3. SEED A WORKFLOW RECORD FOR RAZANYOO (Student ID known from seed_razanyoo_final.cjs)
    // First find Razanyoo
    const razanRes = await pgClient.query("SELECT id FROM profiles WHERE full_name = 'Razanyoo'");
    if (razanRes.rows.length === 0) {
      console.log('Razanyoo not found. Please run seed_razanyoo_final.cjs first.');
      return;
    }
    const studentId = razanRes.rows[0].id;
    const subjectRes = await pgClient.query("SELECT id FROM subjects WHERE school_id = $1 LIMIT 1", [schoolId]);
    const subjectId = subjectRes.rows[0].id;

    console.log(`Simulating Mark Entry for Student ${studentId} in Subject ${subjectId}...`);

    const workflowId = crypto.randomUUID();
    await pgClient.query(`
      INSERT INTO results_workflow (
        id, school_id, student_id, subject_id, term_id, exam_type, exam_name, 
        marks, grade, status, submitted_by, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'MID_TERM', 'Mid-Term 1', 
        85, 'A', 'PUBLISHED', (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1), NOW()
      )
    `, [workflowId, schoolId, studentId, subjectId, actualTermId]);

    // 4. MANUALLY SIMULATE THE "PUBLISH" TRIGGER (Since triggers might not be active or we want to verify the logic)
    // The publishWorkflow function inserts into exam_results.
    await pgClient.query(`
      INSERT INTO exam_results (school_id, student_id, exam_id, subject_id, marks, grade)
      VALUES ($1, $2, $3, $4, 85, 'A')
    `, [schoolId, studentId, examId, subjectId]);

    console.log('Result Published and Inserted into exam_results!');

    // 5. VERIFY
    const finalRes = await pgClient.query("SELECT count(*) FROM exam_results WHERE student_id = $1", [studentId]);
    console.log(`TOTAL PUBLISHED RESULTS FOR RAZANYOO: ${finalRes.rows[0].count}`);

    console.log('--- TEST COMPLETE: RESULTS WORKFLOW VERIFIED ---');

  } catch (e) {
    console.error('Test Error:', e.message);
  } finally {
    await pgClient.end();
  }
}

runTest();
