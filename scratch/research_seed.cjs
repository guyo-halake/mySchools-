const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

const SCHOOL_ID = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';

async function research() {
  await client.connect();
  console.log('--- SCHOOLS ---');
  const schools = await client.query('SELECT id, name FROM schools LIMIT 5');
  console.log(schools.rows);

  console.log('--- GRADE 6 STREAMS ---');
  const streams = await client.query(`
    SELECT s.id, s.name, c.level, c.name as class_name 
    FROM streams s JOIN classes c ON s.class_id = c.id 
    WHERE c.school_id = $1 AND c.level = 6
  `, [SCHOOL_ID]);
  console.log(streams.rows);

  console.log('--- TERMS ---');
  const terms = await client.query('SELECT id, name, year, start_date FROM terms WHERE school_id = $1 ORDER BY start_date DESC LIMIT 4', [SCHOOL_ID]);
  console.log(terms.rows);

  console.log('--- EXAMS ---');
  const exams = await client.query('SELECT id, name, term_id FROM exams WHERE school_id = $1 LIMIT 5', [SCHOOL_ID]);
  console.log(exams.rows);

  await client.end();
}

research().catch(console.error);
