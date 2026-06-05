const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const GIAKANJA_ID = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  
  console.log('--- DB AUDIT FOR GIAKANJA BOYS HIGH SCHOOL ---');

  // 1. Total Students
  const studentsRes = await client.query('SELECT COUNT(*) FROM students WHERE school_id = $1', [GIAKANJA_ID]);
  const totalStudents = parseInt(studentsRes.rows[0].count);
  console.log(`Total Students: ${totalStudents}`);

  // 2. Students with Fees
  const feesRes = await client.query(`
    SELECT COUNT(DISTINCT student_id) 
    FROM fees 
    WHERE school_id = $1
  `, [GIAKANJA_ID]);
  console.log(`Students with Fees records: ${feesRes.rows[0].count} / ${totalStudents}`);

  // 3. Students with Formative Assessments
  const assessmentsRes = await client.query(`
    SELECT COUNT(DISTINCT student_id) 
    FROM cbc_student_assessments 
    WHERE school_id = $1
  `, [GIAKANJA_ID]);
  console.log(`Students with Formative Assessments: ${assessmentsRes.rows[0].count} / ${totalStudents}`);

  // 4. Total Formative Assessments Count
  const totalAssessmentsRes = await client.query(`
    SELECT COUNT(*) 
    FROM cbc_student_assessments 
    WHERE school_id = $1
  `, [GIAKANJA_ID]);
  console.log(`Total Formative Assessments Count: ${totalAssessmentsRes.rows[0].count}`);

  // 5. Students with Project Submissions
  const submissionsRes = await client.query(`
    SELECT COUNT(DISTINCT student_id) 
    FROM cbc_project_submissions cps
    JOIN cbc_projects cp ON cps.project_id = cp.id
    WHERE cp.school_id = $1
  `, [GIAKANJA_ID]);
  console.log(`Students with Project Submissions: ${submissionsRes.rows[0].count} / ${totalStudents}`);

  // 6. Categories of students in Giakanja
  const categoriesRes = await client.query(`
    SELECT c.category, COUNT(s.id) as student_count
    FROM students s
    JOIN streams st ON s.stream_id = st.id
    JOIN classes c ON st.class_id = c.id
    WHERE s.school_id = $1
    GROUP BY c.category
  `, [GIAKANJA_ID]);
  console.log('Students count by Category:');
  categoriesRes.rows.forEach(r => {
    console.log(` - ${r.category}: ${r.student_count}`);
  });

  // 7. Projects seeded by Category (joining with learning areas)
  const projectsRes = await client.query(`
    SELECT la.category, COUNT(p.id) as project_count
    FROM cbc_projects p
    JOIN learning_areas la ON p.learning_area_id = la.id
    WHERE p.school_id = $1
    GROUP BY la.category
  `, [GIAKANJA_ID]);
  console.log('Projects seeded by Category:');
  projectsRes.rows.forEach(r => {
    console.log(` - ${r.category || 'No Category'}: ${r.project_count}`);
  });

  await client.end();
}

main().catch(console.error);
