const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function verifyFn() {
  await pgClient.connect();
  const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
  const teacherId = 'b9109d4f-ca37-4eec-9860-4fa82342b997';
  const subjectId = '3fa81464-5013-4b2d-8a00-f7e59f73f0c4';
  const streamId = '6d6b6d4b-9d6f-4e6f-8541-4991241a511f';

  const res = await pgClient.query(`
    SELECT teacher_has_scope($1, $2, $3, $4) as has_scope
  `, [schoolId, teacherId, subjectId, streamId]);
  
  console.log('Result of teacher_has_scope:', res.rows[0].has_scope);

  await pgClient.end();
}
verifyFn();
