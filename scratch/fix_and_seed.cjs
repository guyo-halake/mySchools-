const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

const GIAKANJA_ID = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';

async function fixAndSeed() {
  try {
    await client.connect();
    console.log('Connected to Database...');

    // 1. Razanyoo
    const checkRaz = await client.query("SELECT id FROM profiles WHERE full_name = 'Razanyoo' AND role = 'STUDENT' LIMIT 1");
    const razId = checkRaz.rows[0].id;
    const streamRes = await client.query(`SELECT s.id FROM streams s JOIN classes c ON s.class_id = c.id WHERE c.name = 'Grade 6' AND s.name = 'West' LIMIT 1`);
    if (streamRes.rows.length > 0) {
      await client.query(`INSERT INTO students (id, school_id, stream_id, adm_no) VALUES ($1, $2, $3, 'RAZ-2026-001') ON CONFLICT (id) DO NOTHING`, [razId, GIAKANJA_ID, streamRes.rows[0].id]);
    }

    // 2. Seed Results
    const studentsRes = await client.query(`SELECT s.id, c.level, c.category FROM students s JOIN streams st ON s.stream_id = st.id JOIN classes c ON st.class_id = c.id WHERE s.school_id = $1`, [GIAKANJA_ID]);
    const students = studentsRes.rows;

    const subStrandsRes = await client.query(`
      SELECT ss.id as sub_id, st.id as strand_id, la.id as area_id, la.category as la_category, st.name as st_name, ss.name as ss_name
      FROM cbc_sub_strands ss
      JOIN cbc_strands st ON ss.strand_id = st.id
      JOIN learning_areas la ON st.learning_area_id = la.id
      WHERE la.school_id = $1
    `, [GIAKANJA_ID]);
    const subStrands = subStrandsRes.rows;

    console.log(`Seeding results for ${students.length} students...`);

    for (const student of students) {
      let targetSubs;
      if (student.level >= 7) {
        targetSubs = subStrands.filter(s => s.la_category === 'Junior High School');
      } else if (student.level >= 4) {
        targetSubs = subStrands.filter(s => s.la_category === 'Upper Primary');
      } else {
        targetSubs = subStrands.filter(s => s.la_category.includes('Primary'));
      }

      if (targetSubs.length === 0) continue;

      const count = 3 + Math.floor(Math.random() * 2);
      const shuffled = targetSubs.sort(() => 0.5 - Math.random()).slice(0, count);

      for (const sub of shuffled) {
        let rating = student.level >= 7 ? ['EE1', 'EE2', 'ME1', 'ME2'][Math.floor(Math.random() * 4)] : ['EE', 'ME', 'AE'][Math.floor(Math.random() * 3)];

        await client.query(`
          INSERT INTO cbc_student_assessments (
            school_id, student_id, learning_area_id, strand_id, sub_strand_id, 
            rating, teacher_comment, grade_level_at_time, updated_at,
            strand, sub_strand
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT DO NOTHING
        `, [
          GIAKANJA_ID, student.id, sub.area_id, sub.strand_id, sub.sub_id,
          rating, 'Strong progress.', student.level, '2026-04-10T10:00:00Z',
          sub.st_name, sub.ss_name
        ]);
      }
    }
    console.log('Seeding Complete!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

fixAndSeed();
