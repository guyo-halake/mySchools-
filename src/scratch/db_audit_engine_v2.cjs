const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('--- DATABASE ARCHITECTURE AUDIT v2 ---');

    // 1. Get exact function definition for grading/averages
    const funcDef = await client.query(`
      SELECT routine_name, routine_definition 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'recompute_student_term_averages'
    `);
    if (funcDef.rows.length > 0) {
      console.log('Function recompute_student_term_averages definition:');
      console.log(funcDef.rows[0].routine_definition);
    }

    // 2. Check for any other table with "grade" in it
    const gradeTables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%grade%'");
    console.log('Grade-related tables:', gradeTables.rows.map(r => r.table_name));

    // 3. Sample from student_term_averages
    const avgSample = await client.query('SELECT * FROM student_term_averages LIMIT 1');
    console.log('Sample student_term_averages:', avgSample.rows[0]);

    // 4. Check for Exams table
    const exams = await client.query('SELECT * FROM exams LIMIT 1');
    console.log('Sample Exam:', exams.rows[0]);

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await client.end();
  }
}

audit();
