const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const r = await client.query(`
      SELECT grade, min_mark, max_mark, grade_point, count(*) 
      FROM grading_systems 
      WHERE school_id = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5' 
      GROUP BY grade, min_mark, max_mark, grade_point 
      ORDER BY max_mark DESC
    `);
    console.log('--- FULL GRADING SCALE AUDIT ---');
    console.table(r.rows);
  } finally {
    await client.end();
  }
}

audit();
