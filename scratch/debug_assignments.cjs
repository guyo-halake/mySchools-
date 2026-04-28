const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function debug() {
  await pgClient.connect();
  const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
  
  console.log('--- DB ASSIGNMENT DEBUG ---');
  const res = await pgClient.query("SELECT * FROM teacher_subject_stream_assignments WHERE school_id = $1", [schoolId]);
  console.table(res.rows);
  
  console.log('--- STUDENT STREAM DEBUG ---');
  const st = await pgClient.query("SELECT id, stream_id FROM students WHERE school_id = $1 LIMIT 1", [schoolId]);
  console.table(st.rows);

  await pgClient.end();
}
debug();
