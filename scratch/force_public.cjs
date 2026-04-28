const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
async function run(){
  try {
    await client.connect();
    const tables = [
      'schools', 'students', 'streams', 'exams', 'subjects', 
      'exam_results', 'fees', 'announcements', 'school_events', 
      'classes', 'attendance', 'profiles'
    ];
    for (const table of tables) {
      // Create a policy that allows everything for everyone (Public Read/Write for this project)
      await client.query(`DROP POLICY IF EXISTS "Public Full Access" ON ${table}`);
      await client.query(`CREATE POLICY "Public Full Access" ON ${table} FOR ALL USING (true) WITH CHECK (true)`);
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      console.log(`Explicit Public Access policy created for ${table}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
