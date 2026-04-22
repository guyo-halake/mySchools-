const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function seedRazanyoo() {
  try {
    await pgClient.connect();
    // 1. Get Razanyoo's IDs
    const studentRes = await pgClient.query(`SELECT id, school_id FROM students WHERE adm_no = 'GHS-7777'`);
    if (studentRes.rows.length === 0) throw new Error('Razanyoo not found');
    const studentId = studentRes.rows[0].id;
    const schoolId = studentRes.rows[0].school_id;

    // 2. Get all subject IDs for Razanyoo
    const subjRes = await pgClient.query('SELECT subject_id FROM student_subjects WHERE student_id = $1', [studentId]);
    const subjectIds = subjRes.rows.map(r => r.subject_id);
    if (subjectIds.length === 0) throw new Error('No subjects found for Razanyoo');

    // 3. Get all term IDs (Form 1-4, Term 1-3, years 2023-2026)
    const termRes = await pgClient.query('SELECT id, name, year FROM terms WHERE year BETWEEN 2023 AND 2026');
    const terms = termRes.rows;

    // 4. Get all exam IDs (Mid-term, End-term for each term)
    const examRes = await pgClient.query("SELECT id, term_id, name FROM exams WHERE name IN ('Mid-term', 'End-term')");
    const exams = examRes.rows;

    // 5. Seed exam_results for every subject, term, and exam
    for (const term of terms) {
      for (const exam of exams.filter(e => e.term_id === term.id)) {
        for (const subjectId of subjectIds) {
          const marks = Math.floor(Math.random() * 46) + 50; // 50-95
          await pgClient.query(
            'INSERT INTO exam_results (id, school_id, student_id, exam_id, subject_id, marks, grade) VALUES ($1, $2, $3, $4, $5, $6, NULL) ON CONFLICT DO NOTHING',
            [uuidv4(), schoolId, studentId, exam.id, subjectId, marks]
          );
        }
      }
    }

    // 6. Seed fees for each term
    for (const term of terms) {
      await pgClient.query(
        'INSERT INTO fees (id, school_id, student_id, term_id, type, amount_due, amount_paid, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING',
        [uuidv4(), schoolId, studentId, term.id, 'Tuition', 20000, 20000, 'PAID']
      );
    }

    // 7. Seed attendance for every day in 2026 (Form 4, Term 1 & 2)
    const attendanceDays = [];
    for (const term of terms.filter(t => t.year === 2026 && (t.name === 'Term 1' || t.name === 'Term 2'))) {
      let start = new Date(term.start_date);
      let end = new Date(term.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        attendanceDays.push({ termId: term.id, date: new Date(d) });
      }
    }
    for (const day of attendanceDays) {
      await pgClient.query(
        'INSERT INTO attendance (id, student_id, date, status, term_id, remarks) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
        [uuidv4(), studentId, day.date, 'PRESENT', day.termId, null]
      );
    }

    // 8. Seed disciplinary record
    await pgClient.query(
      'INSERT INTO disciplinary_records (id, student_id, school_id, incident_date, incident_title, description, action_taken, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING',
      [uuidv4(), studentId, schoolId, '2024-07-05', 'Found with phone in dorm', 'Student was found with a phone in the dormitory.', 'Suspended for two weeks', 'RESOLVED']
    );

    // 9. Seed co-curricular (basketball, school team)
    // Find or create basketball activity
    let activityId;
    const actRes = await pgClient.query("SELECT id FROM activities WHERE LOWER(name) = 'basketball'");
    if (actRes.rows.length > 0) {
      activityId = actRes.rows[0].id;
    } else {
      activityId = uuidv4();
      await pgClient.query('INSERT INTO activities (id, school_id, name, category) VALUES ($1, $2, $3, $4)', [activityId, schoolId, 'Basketball', 'SPORT']);
    }
    await pgClient.query(
      'INSERT INTO student_activities (id, student_id, activity_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [uuidv4(), studentId, activityId]
    );

    console.log('Seeding complete for Razanyoo Guyo.');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pgClient.end();
  }
}

seedRazanyoo();
