const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    
    console.log('--- EXAM RESULTS ---');
    const results = await client.query(`
      SELECT er.*, s.name as subject_name, e.name as exam_name, t.name as term_name 
      FROM exam_results er
      JOIN subjects s ON er.subject_id = s.id
      JOIN exams e ON er.exam_id = e.id
      JOIN terms t ON e.term_id = t.id
      LIMIT 10
    `);
    console.table(results.rows);

    console.log('--- TERMS ---');
    const terms = await client.query('SELECT * FROM terms LIMIT 10');
    console.table(terms.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

audit();
