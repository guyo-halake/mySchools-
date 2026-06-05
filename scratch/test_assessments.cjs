const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const GIAKANJA_ID = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  
  // Query 5 assessments
  const res = await client.query(`
    SELECT id, school_id, student_id, rating, created_at 
    FROM cbc_student_assessments 
    WHERE school_id = $1 
    LIMIT 5
  `, [GIAKANJA_ID]);
  console.log('Sample assessments in DB:', res.rows);

  // Check if there are any assessments that match the students we have
  const joinRes = await client.query(`
    SELECT COUNT(*) 
    FROM cbc_student_assessments a
    JOIN students s ON a.student_id = s.id
    WHERE a.school_id = $1
  `, [GIAKANJA_ID]);
  console.log('Count of assessments joining with students table:', joinRes.rows[0].count);

  await client.end();
}

main().catch(console.error);
