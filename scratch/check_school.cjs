const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });

client.connect().then(async () => {
  try {
    const r1 = await client.query("SELECT id, name FROM schools WHERE name ILIKE '%P3L%'");
    console.log('School:', r1.rows);
    if (r1.rows.length > 0) {
      const sid = r1.rows[0].id;
      const r2 = await client.query('SELECT id, name FROM exams WHERE school_id = $1', [sid]);
      console.log('Exams:', r2.rows);
      const r3 = await client.query('SELECT id, name FROM subjects WHERE school_id = $1', [sid]);
      console.log('Subjects:', r3.rows);
      const r4 = await client.query('SELECT id, name FROM exam_windows WHERE school_id = $1', [sid]);
      console.log('Exam Windows:', r4.rows);
    }
  } catch (e) {
    console.error(e);
  } finally {
    client.end();
  }
});
