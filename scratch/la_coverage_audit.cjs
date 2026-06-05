const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function runCoverageAudit() {
  try {
    await client.connect();
    
    console.log('=== Assessment Count by Learning Area ===');
    const laCoverage = await client.query(`
      SELECT 
        la.name as learning_area_name,
        COUNT(a.id) as total_assessment_records,
        COUNT(DISTINCT a.student_id) as students_assessed
      FROM learning_areas la
      LEFT JOIN cbc_student_assessments a ON la.id = a.learning_area_id
      WHERE la.active = true
      GROUP BY la.id, la.name
      ORDER BY total_assessment_records DESC
    `);
    console.table(laCoverage.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

runCoverageAudit();
