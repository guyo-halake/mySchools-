const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function fullAudit() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const razanId = '037c8a46-f82f-40df-99ba-5e41904612d2';

    console.log('--- STUDENT BASIC INFO ---');
    const st = await client.query('SELECT * FROM students WHERE id = $1', [razanId]);
    console.table(st.rows);

    console.log('--- ENROLLED SUBJECTS ---');
    const subs = await client.query(`
      SELECT s.name as subject_name 
      FROM student_subjects ss 
      JOIN subjects s ON ss.subject_id = s.id 
      WHERE ss.student_id = $1
    `, [razanId]);
    console.table(subs.rows);

    console.log('--- ACTIVITIES ---');
    const acts = await client.query(`
      SELECT a.name as activity_name 
      FROM student_activities sa 
      JOIN activities a ON sa.activity_id = a.id 
      WHERE sa.student_id = $1
    `, [razanId]);
    console.table(acts.rows);

    console.log('--- HEALTH ---');
    const health = await client.query('SELECT * FROM student_health WHERE student_id = $1', [razanId]);
    console.table(health.rows);

    console.log('--- SEARCHING FOR FEE/PAYMENT TABLES ---');
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    const financialTables = tables.rows.filter(r => /fee|payment|trans|balanc|account|invoice/i.test(r.table_name));
    console.log('Potential financial tables:', financialTables.map(r => r.table_name));

    for (const tbl of financialTables) {
      console.log(`--- DATA FROM ${tbl.table_name} ---`);
      try {
        const data = await client.query(`SELECT * FROM ${tbl.table_name} WHERE student_id = $1 OR id IN (SELECT id FROM ${tbl.table_name} LIMIT 1)`, [razanId]);
        console.table(data.rows);
      } catch (e) {
        console.log(`Failed to read ${tbl.table_name}: ${e.message}`);
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

fullAudit();
