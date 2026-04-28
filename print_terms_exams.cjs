const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function printTermsAndExams() {
  try {
    await pgClient.connect();
    const terms = await pgClient.query('SELECT id, name, year, start_date, end_date FROM terms ORDER BY year, name');
    console.log('Terms:');
    for (const t of terms.rows) {
      console.log(t);
    }
    const exams = await pgClient.query('SELECT id, term_id, name, type, date FROM exams ORDER BY term_id, name');
    console.log('\nExams:');
    for (const e of exams.rows) {
      console.log(e);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pgClient.end();
  }
}

printTermsAndExams();
