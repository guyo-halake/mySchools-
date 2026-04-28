
const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function auditPolicies() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT tablename, policyname, cmd, roles, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('announcements', 'events')
    `);
    console.log('--- POLICIES ---');
    console.log(JSON.stringify(res.rows, null, 2));

    const counts = await client.query(`
      SELECT 
        (SELECT count(*) FROM announcements) as ann_count,
        (SELECT count(*) FROM events) as eve_count
    `);
    console.log('--- ACTUAL COUNTS ---');
    console.log(JSON.stringify(counts.rows, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

auditPolicies();
