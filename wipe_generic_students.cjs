const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function wipeGenericStudents() {
  try {
    await pgClient.connect();
    console.log('Connected to DB...');

    const schoolRes = await pgClient.query("SELECT id FROM schools WHERE subdomain = 'giakanja'");
    if (schoolRes.rows.length === 0) return;
    const schoolId = schoolRes.rows[0].id;

    console.log('Wiping assessments...');
    await pgClient.query("DELETE FROM cbc_student_assessments WHERE school_id = $1", [schoolId]);

    console.log('Fetching student and parent IDs...');
    const studentsRes = await pgClient.query("SELECT id, parent_id FROM students WHERE school_id = $1", [schoolId]);
    
    const studentIds = studentsRes.rows.map(r => r.id);
    const parentIds = studentsRes.rows.map(r => r.parent_id).filter(id => id != null);

    console.log(`Deleting ${studentIds.length} students...`);
    await pgClient.query("DELETE FROM students WHERE school_id = $1", [schoolId]);

    const allProfileIds = [...studentIds, ...parentIds];
    if (allProfileIds.length > 0) {
      console.log(`Deleting ${allProfileIds.length} generic profiles...`);
      // Use chunks to avoid passing too many parameters if necessary, but 440 is fine
      await pgClient.query("DELETE FROM profiles WHERE id = ANY($1::uuid[]) AND role IN ('STUDENT', 'PARENT')", [allProfileIds]);
    }

    console.log('Generic data successfully wiped!');

  } catch (err) {
    console.error('Wipe failed:', err);
  } finally {
    await pgClient.end();
  }
}

wipeGenericStudents();
