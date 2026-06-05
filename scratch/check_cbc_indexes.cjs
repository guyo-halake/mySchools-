const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  await client.connect();
  console.log('Connected to PG Database...');

  // Get index/constraints for cbc_student_assessments
  const res = await client.query(`
    SELECT
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM
      pg_indexes
    WHERE
      tablename = 'cbc_student_assessments';
  `);

  console.log('Indexes on cbc_student_assessments:');
  console.log(res.rows);

  await client.end();
}

main().catch(console.error);
