const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  await client.connect();
  console.log('Connected to PG Database...');

  // Get table info
  const tables = ['learning_areas', 'cbc_strands', 'cbc_sub_strands', 'cbc_student_assessments', 'cbc_project_submissions', 'cbc_rating_scales', 'cbc_assessment_rubrics'];
  
  for (const t of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = '${t}'
      ORDER BY ordinal_position;
    `);
    if (res.rows.length > 0) {
      console.log(`\nColumns for table: ${t}`);
      console.table(res.rows);
    } else {
      console.log(`\nTable ${t} does not exist.`);
    }
  }

  // Let's also check if there are other tables related to CBC
  const allTables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE '%cbc%';
  `);
  console.log('\nAll CBC tables in DB:');
  console.table(allTables.rows);

  await client.end();
}

main().catch(console.error);
