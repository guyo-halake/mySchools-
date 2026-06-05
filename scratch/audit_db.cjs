const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function runAudit() {
  try {
    await client.connect();
    console.log('=== DATABASE AUDIT ===\n');

    // 1. Total student count per class (Grade + Stream)
    const classCountRes = await client.query(`
      SELECT c.name as grade, s.name as stream, COUNT(st.id) as student_count
      FROM students st
      JOIN streams s ON st.stream_id = s.id
      JOIN classes c ON s.class_id = c.id
      GROUP BY c.name, s.name
      ORDER BY c.name, s.name
    `);
    console.log('1. Student Count by Grade and Stream:');
    console.table(classCountRes.rows);

    // 2. Count of active subjects/learning areas
    const subjectsRes = await client.query(`
      SELECT COUNT(*) as total_subjects FROM subjects
    `);
    console.log(`2. Total Subjects (Learning Areas) in Database: ${subjectsRes.rows[0].total_subjects}\n`);

    // Let's see which subjects exist
    const subjectsList = await client.query(`
      SELECT id, name FROM subjects LIMIT 15
    `);
    console.log('Sample Subjects:');
    console.table(subjectsList.rows);

    // 3. Audit student assessments:
    // Let's count how many distinct subjects are assessed for each student.
    // We group by student, count distinct subject_id from cbc_student_assessments.
    const studentAssessmentsRes = await client.query(`
      SELECT 
        st.id as student_id,
        p.full_name,
        c.name as grade,
        s.name as stream,
        COUNT(DISTINCT a.subject_id) as assessed_subjects_count
      FROM students st
      JOIN profiles p ON st.id = p.id
      JOIN streams s ON st.stream_id = s.id
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN cbc_student_assessments a ON st.id = a.student_id
      GROUP BY st.id, p.full_name, c.name, s.name
    `);

    const students = studentAssessmentsRes.rows;
    console.log(`Total students audited: ${students.length}\n`);

    // We can group students by grade and stream, and count their assessment status.
    // Let's assume a student has:
    // - "All Results" if assessed_subjects_count >= total active subjects for their grade (or let's find the max assessed subjects for any student in that grade to determine total subjects, or count total subjects per grade if subjects are grade-specific).
    // Let's query how many distinct subjects actually have assessments for each grade.
    const gradeActiveSubjectsRes = await client.query(`
      SELECT c.name as grade, COUNT(DISTINCT a.subject_id) as total_assessed_subjects
      FROM cbc_student_assessments a
      JOIN students st ON a.student_id = st.id
      JOIN streams s ON st.stream_id = s.id
      JOIN classes c ON s.class_id = c.id
      GROUP BY c.name
      ORDER BY c.name
    `);
    console.log('3. Max distinct subjects with active assessments per Grade:');
    console.table(gradeActiveSubjectsRes.rows);

    const subjectsPerGrade = {};
    gradeActiveSubjectsRes.rows.forEach(r => {
      subjectsPerGrade[r.grade] = Number(r.total_assessed_subjects);
    });

    // Let's categorize each student's assessment status:
    // - FULL: assessed_subjects_count >= subjectsPerGrade[grade] (and subjectsPerGrade[grade] > 0)
    // - PARTIAL (Multiple): assessed_subjects_count > 1 AND assessed_subjects_count < subjectsPerGrade[grade]
    // - ONLY ONE: assessed_subjects_count === 1
    // - NONE: assessed_subjects_count === 0
    const auditSummary = {};

    students.forEach(st => {
      const key = `${st.grade} - ${st.stream}`;
      if (!auditSummary[key]) {
        auditSummary[key] = {
          grade: st.grade,
          stream: st.stream,
          totalStudents: 0,
          none: 0,
          onlyOne: 0,
          partialMultiple: 0,
          full: 0
        };
      }
      
      const targetCount = subjectsPerGrade[st.grade] || 0;
      const count = Number(st.assessed_subjects_count);

      auditSummary[key].totalStudents++;
      if (count === 0) {
        auditSummary[key].none++;
      } else if (count === 1) {
        auditSummary[key].onlyOne++;
      } else if (targetCount > 0 && count >= targetCount) {
        auditSummary[key].full++;
      } else {
        auditSummary[key].partialMultiple++;
      }
    });

    console.log('4. Assessment Completion Audit by Grade & Stream:');
    console.table(Object.values(auditSummary));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

runAudit();
