const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
async function run(){
  try {
    await client.connect();
    const tables = [
      'schools', 'students', 'streams', 'exams', 'subjects', 
      'exam_results', 'fees', 'announcements', 'school_events', 
      'classes', 'attendance'
    ];
    for (const table of tables) {
      await client.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
      console.log(`RLS disabled for ${table}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
