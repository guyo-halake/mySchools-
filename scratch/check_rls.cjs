const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  
  // 1. Check if row security is active
  const rlsRes = await client.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'cbc_student_assessments'
  `);
  console.log('Row security enabled:', rlsRes.rows);

  // 2. Check active policies
  const polRes = await client.query(`
    SELECT policyname, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'cbc_student_assessments'
  `);
  console.log('Policies for cbc_student_assessments:', polRes.rows);

  await client.end();
}

main().catch(console.error);
