const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function seedExamsForAllTerms() {
  try {
    await pgClient.connect();
    const terms = await pgClient.query('SELECT id, school_id, name, year, start_date, end_date FROM terms');
    let count = 0;
    for (const term of terms.rows) {
      // Mid-term: 1/3 into the term, End-term: last day
      const start = new Date(term.start_date);
      const end = new Date(term.end_date);
      const mid = new Date(start.getTime() + (end.getTime() - start.getTime()) / 3);
      // Insert Mid-term
      await pgClient.query(
        'INSERT INTO exams (id, school_id, term_id, name, type, date) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
        [uuidv4(), term.school_id, term.id, 'Mid-term', 'MID_TERM', mid]
      );
      // Insert End-term
      await pgClient.query(
        'INSERT INTO exams (id, school_id, term_id, name, type, date) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
        [uuidv4(), term.school_id, term.id, 'End-term', 'END_TERM', end]
      );
      count += 2;
    }
    console.log('Seeded exams for all terms:', count);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pgClient.end();
  }
}

seedExamsForAllTerms();
