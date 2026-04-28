const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const razanId = '037c8a46-f82f-40df-99ba-5e41904612d2';

    console.log('--- SUBJECTS ---');
    const subs = await client.query(`
      SELECT s.name 
      FROM student_subjects ss 
      JOIN subjects s ON ss.subject_id = s.id 
      WHERE ss.student_id = $1
    `, [razanId]);
    console.table(subs.rows);

    console.log('--- ACTIVITIES ---');
    const acts = await client.query(`
      SELECT a.name 
      FROM student_activities sa 
      JOIN activities a ON sa.activity_id = a.id 
      WHERE sa.student_id = $1
    `, [razanId]);
    console.table(acts.rows);

    console.log('--- HEALTH ---');
    const health = await client.query(`
      SELECT * FROM student_health WHERE student_id = $1
    `, [razanId]);
    console.table(health.rows);

    console.log('--- FEES / BALANCES ---');
    const student = await client.query(`
      SELECT id, adm_no, fee_balance FROM students WHERE id = $1
    `, [razanId]);
    console.table(student.rows);

    // Check for a fees table too
    const feeRecords = await client.query(`
      SELECT * FROM fees WHERE student_id = $1 LIMIT 5
    `, [razanId]).catch(() => ({ rows: [] }));
    console.log('Fee records count:', feeRecords.rows.length);
    console.table(feeRecords.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

audit();
