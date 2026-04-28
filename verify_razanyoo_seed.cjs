const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function verifyRazanyoo() {
  try {
    await pgClient.connect();
    // 1. Student basic info
    const studentRes = await pgClient.query(`SELECT id, adm_no, school_id FROM students WHERE adm_no = 'GHS-7777'`);
    if (studentRes.rows.length === 0) throw new Error('Razanyoo not found');
    const studentId = studentRes.rows[0].id;
    const schoolId = studentRes.rows[0].school_id;
    console.log('Student found:', studentId);

    // 2. Subjects
    const subjRes = await pgClient.query('SELECT COUNT(*) FROM student_subjects WHERE student_id = $1', [studentId]);
    console.log('Subjects enrolled:', subjRes.rows[0].count);

    // 3. Exam results
    const resultsRes = await pgClient.query('SELECT COUNT(*) FROM exam_results WHERE student_id = $1', [studentId]);
    console.log('Exam results:', resultsRes.rows[0].count);

    // 4. Fees
    const feesRes = await pgClient.query('SELECT COUNT(*) FROM fees WHERE student_id = $1', [studentId]);
    console.log('Fees records:', feesRes.rows[0].count);

    // 5. Attendance
    const attRes = await pgClient.query('SELECT COUNT(*) FROM attendance WHERE student_id = $1', [studentId]);
    console.log('Attendance records:', attRes.rows[0].count);

    // 6. Discipline
    const discRes = await pgClient.query('SELECT COUNT(*) FROM disciplinary_records WHERE student_id = $1', [studentId]);
    console.log('Disciplinary records:', discRes.rows[0].count);

    // 7. Co-curricular
    const actRes = await pgClient.query('SELECT COUNT(*) FROM student_activities WHERE student_id = $1', [studentId]);
    console.log('Co-curricular activities:', actRes.rows[0].count);
  } catch (e) {
    console.error('Verification error:', e);
  } finally {
    await pgClient.end();
  }
}

verifyRazanyoo();
