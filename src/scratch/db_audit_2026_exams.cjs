const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const sid = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    const r = await client.query(`
      SELECT e.id, e.name as exam_name, t.name as term_name, t.year
      FROM exams e
      JOIN terms t ON e.term_id = t.id
      WHERE t.school_id = $1 AND t.year = 2026
    `, [sid]);
    console.log('EXAMS IN 2026:');
    console.table(r.rows);
  } finally {
    await client.end();
  }
}

audit();
