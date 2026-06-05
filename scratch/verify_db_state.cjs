const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function verifyData() {
  try {
    await client.connect();
    console.log('--- DATABASE VERIFICATION REPORT ---');

    // 1. Check Razanyoo
    const razRes = await client.query(`
      SELECT p.full_name, s.adm_no, c.name as class_name, st.name as stream_name
      FROM profiles p
      JOIN students s ON p.id = s.id
      JOIN streams st ON s.stream_id = st.id
      JOIN classes c ON st.class_id = c.id
      WHERE p.full_name ILIKE '%Razanyoo%'
    `);
    console.log('\n1. Razanyoo Existence:', razRes.rows.length > 0 ? 'YES' : 'NO');
    if (razRes.rows.length > 0) console.log('   Details:', razRes.rows[0]);

    // 2. Counts of students with Formative results by Class
    const formativeRes = await client.query(`
      SELECT c.name as class_name, COUNT(DISTINCT a.student_id) as students_with_results
      FROM cbc_student_assessments a
      JOIN students s ON a.student_id = s.id
      JOIN streams st ON s.stream_id = st.id
      JOIN classes c ON st.class_id = c.id
      GROUP BY c.name
      ORDER BY c.name
    `);
    console.log('\n2. Formative Results (Live Gradebook) by Class:');
    console.table(formativeRes.rows);

    // 3. Summative Results (Project Submissions)
    const summativeRes = await client.query(`
      SELECT COUNT(*) as total_submissions, COUNT(DISTINCT student_id) as distinct_students
      FROM cbc_project_submissions
    `);
    console.log('\n3. Summative Results (Project Submissions):');
    console.log('   Total Submissions:', summativeRes.rows[0].total_submissions);
    console.log('   Distinct Students with Project Scores:', summativeRes.rows[0].distinct_students);

    // 4. Projects Existence
    const projectsRes = await client.query('SELECT title, deadline FROM cbc_projects');
    console.log('\n4. Existing Projects in Portfolio:');
    console.table(projectsRes.rows);

  } catch (err) {
    console.error('Verification Error:', err.message);
  } finally {
    await client.end();
  }
}

verifyData();
