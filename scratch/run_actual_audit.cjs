const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function runAudit() {
  try {
    await client.connect();
    console.log('=== DETAILED CBC DATABASE AUDIT ===\n');

    // 1. Get all active learning areas
    const laRes = await client.query("SELECT id, name FROM learning_areas WHERE active = true");
    const totalLearningAreas = laRes.rows.length;
    console.log(`Total Active Learning Areas (Subjects): ${totalLearningAreas}`);
    console.log('Learning Areas list:');
    laRes.rows.forEach((r, i) => {
      console.log(`  ${i+1}. ${r.name} (${r.id})`);
    });
    console.log('\n');

    // 2. Fetch distinct learning area assessments per student
    // We group by student, class and stream, and count distinct learning_area_id
    const studentStatsRes = await client.query(`
      SELECT 
        st.id as student_id,
        p.full_name,
        c.name as class_name,
        s.name as stream_name,
        COUNT(DISTINCT a.learning_area_id) as assessed_la_count
      FROM students st
      JOIN profiles p ON st.id = p.id
      JOIN streams s ON st.stream_id = s.id
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN cbc_student_assessments a ON st.id = a.student_id
      GROUP BY st.id, p.full_name, c.name, s.name
      ORDER BY c.name, s.name, p.full_name
    `);

    const students = studentStatsRes.rows;
    console.log(`Total Students Audited: ${students.length}\n`);

    // Let's analyze how many learning areas are actually assessed per Grade level.
    // If a grade level has some learning areas that never get assessed, we should use the max assessed learning areas for a student in that grade as the "expected" number of learning areas for that grade, or simply count distinct learning areas assessed in that grade.
    const gradeExpectedRes = await client.query(`
      SELECT c.name as class_name, COUNT(DISTINCT a.learning_area_id) as total_assessed_la
      FROM cbc_student_assessments a
      JOIN students st ON a.student_id = st.id
      JOIN streams s ON st.stream_id = s.id
      JOIN classes c ON s.class_id = c.id
      GROUP BY c.name
      ORDER BY c.name
    `);

    const expectedPerGrade = {};
    gradeExpectedRes.rows.forEach(r => {
      expectedPerGrade[r.class_name] = Number(r.total_assessed_la);
    });

    console.log('Expected assessed learning areas per Grade (based on active results in database):');
    console.table(gradeExpectedRes.rows);

    // Grouping by class + stream
    const classAudit = {};

    students.forEach(st => {
      const key = `${st.class_name} ${st.stream_name}`;
      if (!classAudit[key]) {
        classAudit[key] = {
          class: st.class_name,
          stream: st.stream_name,
          total_students: 0,
          fully_assessed: 0, // assessed_la_count >= expected for grade (where expected > 0)
          partially_assessed: 0, // assessed_la_count > 1 and < expected
          only_one: 0, // assessed_la_count == 1
          unassessed: 0 // assessed_la_count == 0
        };
      }

      const auditedCount = Number(st.assessed_la_count);
      const expectedCount = expectedPerGrade[st.class_name] || 0;

      classAudit[key].total_students++;

      if (auditedCount === 0) {
        classAudit[key].unassessed++;
      } else if (auditedCount === 1) {
        classAudit[key].only_one++;
      } else if (expectedCount > 0 && auditedCount >= expectedCount) {
        classAudit[key].fully_assessed++;
      } else {
        classAudit[key].partially_assessed++;
      }
    });

    console.log('\nAudit Results (Summary per Class):');
    console.table(Object.values(classAudit));

    // Let's find some details on students who have only one or zero assessments.
    const unassessedSample = students.filter(s => Number(s.assessed_la_count) === 0).slice(0, 10);
    console.log('\nSample Unassessed Students (first 10):');
    console.table(unassessedSample.map(s => ({ Name: s.full_name, Class: `${s.class_name} ${s.stream_name}` })));

    const onlyOneSample = students.filter(s => Number(s.assessed_la_count) === 1).slice(0, 10);
    console.log('\nSample Students with ONLY 1 Learning Area Assessed (first 10):');
    console.table(onlyOneSample.map(s => ({ Name: s.full_name, Class: `${s.class_name} ${s.stream_name}` })));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

runAudit();
