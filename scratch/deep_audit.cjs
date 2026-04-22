const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    
    console.log('--- FINDING STUDENT WITH RESULTS ---');
    const res = await client.query(`
      SELECT DISTINCT student_id FROM exam_results LIMIT 1
    `);
    
    if (res.rows.length === 0) {
      console.log('No results found in exam_results table.');
      return;
    }

    const studentId = res.rows[0].student_id;
    console.log('Found Student ID with results:', studentId);

    const studentInfo = await client.query(`
      SELECT s.*, p.full_name, st.name as stream_name, c.name as class_name, c.level
      FROM students s
      JOIN profiles p ON s.id = p.id
      JOIN streams st ON s.stream_id = st.id
      JOIN classes c ON st.class_id = c.id
      WHERE s.id = $1
    `, [studentId]);
    console.table(studentInfo.rows);

    const results = await client.query(`
      SELECT er.marks, er.grade, s.name as subject_name, t.year, t.name as term_name
      FROM exam_results er
      JOIN subjects s ON er.subject_id = s.id
      JOIN exams e ON er.exam_id = e.id
      JOIN terms t ON e.term_id = t.id
      WHERE er.student_id = $1
    `, [studentId]);
    console.log('Results count for this student:', results.rows.length);
    console.table(results.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

audit();
