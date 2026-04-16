const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function audit() {
  try {
    await pgClient.connect();
    console.log('--- DATABASE AUDIT ---');

    const tables = [
      'schools', 'profiles', 'students', 'classes', 'streams', 'subjects', 
      'exams', 'exam_results', 'fees', 'announcements', 'events', 
      'results_workflow', 'student_health', 'disciplinary_records'
    ];

    for (const table of tables) {
      const res = await pgClient.query(`SELECT count(*) FROM ${table}`);
      console.log(`${table.padEnd(20)}: ${res.rows[0].count}`);
    }

    console.log('\n--- ROLES DISTRIBUTION ---');
    const rolesRes = await pgClient.query('SELECT role, count(*) FROM profiles GROUP BY role');
    rolesRes.rows.forEach(row => {
      console.log(`${row.role.padEnd(20)}: ${row.count}`);
    });

  } catch (e) {
    console.error('Audit Error:', e.message);
  } finally {
    await pgClient.end();
  }
}

audit();
