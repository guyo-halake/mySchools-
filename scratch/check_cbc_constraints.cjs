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
      conname AS constraint_name,
      pg_get_constraintdef(c.oid) AS constraint_definition
    FROM
      pg_constraint c
    JOIN
      pg_namespace n ON n.oid = c.connamespace
    WHERE
      conrelid = 'cbc_student_assessments'::regclass;
  `);

  console.log('Constraints on cbc_student_assessments:');
  console.log(res.rows);

  await client.end();
}

main().catch(console.error);
