const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query("SELECT * FROM pg_policies WHERE tablename IN ('exam_results', 'students', 'profiles', 'exams', 'terms', 'subjects')");
    console.table(res.rows.map(r => ({ table: r.tablename, name: r.policyname, cmd: r.cmd, qual: r.qual })));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

audit();
