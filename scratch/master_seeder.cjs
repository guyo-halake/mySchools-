const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

const GIAKANJA_ID = '4eb8b0f6-90be-44d5-b220-a7995cc3c87b'; // Actually Alliance was first, but user mentioned Giakanja. I'll use the ID I found earlier.
const ACTUAL_GIAKANJA_ID = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
const TERM1_ID = 'bfcf555c-4f85-48ad-989c-f25b838b247f';

async function seedEverything() {
  try {
    await client.connect();
    console.log('Connected to Database...');

    // 1. Get all students in Giakanja with their class levels
    const studentsRes = await client.query(`
      SELECT s.id, s.stream_id, c.level, c.category
      FROM students s
      JOIN streams st ON s.stream_id = st.id
      JOIN classes c ON st.class_id = c.id
      WHERE s.school_id = $1
    `, [ACTUAL_GIAKANJA_ID]);
    const students = studentsRes.rows;

    // 2. Get available sub-strands
    const subStrandsRes = await client.query(`
      SELECT ss.id as sub_id, st.id as strand_id, la.id as area_id, la.category
      FROM cbc_sub_strands ss
      JOIN cbc_strands st ON ss.strand_id = st.id
      JOIN learning_areas la ON st.learning_area_id = la.id
      WHERE la.school_id = $1
    `, [ACTUAL_GIAKANJA_ID]);
    const subStrands = subStrandsRes.rows;

    const primarySubs = subStrands.filter(s => s.category === 'PRIMARY');
    const jssSubs = subStrands.filter(s => s.category === 'JUNIOR_SECONDARY');

    console.log(`Found ${students.length} students. Seeding Term 1 assessments...`);

    for (const student of students) {
      const isJSS = student.level >= 7;
      const targetSubs = isJSS ? jssSubs : primarySubs;
      
      if (targetSubs.length === 0) continue;

      const count = 3 + Math.floor(Math.random() * 3);
      const shuffled = targetSubs.sort(() => 0.5 - Math.random()).slice(0, count);

      for (const sub of shuffled) {
        let rating;
        if (isJSS) {
          const ratings = ['EE1', 'EE2', 'ME1', 'ME2', 'AE1', 'AE2'];
          rating = ratings[Math.floor(Math.random() * ratings.length)];
        } else {
          const ratings = ['EE', 'ME', 'AE'];
          rating = ratings[Math.floor(Math.random() * ratings.length)];
        }

        await client.query(`
          INSERT INTO cbc_student_assessments (school_id, student_id, learning_area_id, strand_id, sub_strand_id, rating, teacher_comment, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT DO NOTHING
        `, [ACTUAL_GIAKANJA_ID, student.id, sub.area_id, sub.strand_id, sub.sub_id, rating, 'Well demonstrated competency.', '2026-04-10T10:00:00Z']);
      }
    }

    // 3. Seed Projects
    console.log('Seeding Term 1 Projects...');
    const projectAreas = ['Integrated Science', 'Social Studies', 'Mathematics', 'English', 'Science and Technology'];
    for (const areaName of projectAreas) {
      const areaRes = await client.query('SELECT id FROM learning_areas WHERE name = $1 AND school_id = $2', [areaName, ACTUAL_GIAKANJA_ID]);
      if (areaRes.rows.length === 0) continue;
      const areaId = areaRes.rows[0].id;

      const projectRes = await client.query(`
        INSERT INTO cbc_projects (school_id, term_id, learning_area_id, title, description, deadline)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [ACTUAL_GIAKANJA_ID, TERM1_ID, areaId, `${areaName} Community Project`, `Portfolio assessment project for Term 1 ${areaName}`, '2026-04-15']);
      
      let projectId;
      if (projectRes.rows.length > 0) {
        projectId = projectRes.rows[0].id;
      } else {
        const check = await client.query('SELECT id FROM cbc_projects WHERE title = $1 AND school_id = $2', [`${areaName} Community Project`, ACTUAL_GIAKANJA_ID]);
        projectId = check.rows[0].id;
      }

      // Seed submissions for students
      const targetStudents = students.sort(() => 0.5 - Math.random()).slice(0, 50); 
      for (const student of targetStudents) {
        const isJSS = student.level >= 7;
        const rating = isJSS ? 'EE2' : 'ME';
        await client.query(`
          INSERT INTO cbc_project_submissions (project_id, student_id, rubric_rating, teacher_comment)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, [projectId, student.id, rating, 'Excellent project work and evidence collection.']);
      }
    }

    console.log('Master Seeding Complete for Giakanja Boys High School!');
  } catch (err) {
    console.error('Master Seeding Error:', err);
  } finally {
    await client.end();
  }
}

seedEverything();
