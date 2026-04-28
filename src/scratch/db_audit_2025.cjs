const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const r = await client.query(`
      SELECT r.student_id, p.full_name, t.year, t.name as term, e.name as exam, r.marks
      FROM exam_results r
      JOIN exams e ON r.exam_id = e.id
      JOIN terms t ON e.term_id = t.id
      JOIN students s ON r.student_id = s.id
      JOIN profiles p ON s.id = p.id
      WHERE t.year = 2025
      LIMIT 10
    `);
    console.log('RESULTS IN 2025:');
    console.table(r.rows);
  } finally {
    await client.end();
  }
}

audit();
