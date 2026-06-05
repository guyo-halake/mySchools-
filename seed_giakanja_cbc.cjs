const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const pgClient = new Client({ connectionString });

const CBC_LEARNING_AREAS = [
  { name: 'Mathematics', strands: ['Numbers', 'Algebra', 'Geometry'] },
  { name: 'English Language', strands: ['Listening', 'Speaking', 'Reading', 'Writing'] },
  { name: 'Kiswahili Language', strands: ['Kusikiliza na Kuzungumza', 'Kusoma', 'Kuandika'] },
  { name: 'Integrated Science', strands: ['Living Things', 'Environment', 'Matter'] },
  { name: 'Social Studies', strands: ['Our Province', 'Resources', 'Civic Education'] }
];

const RATINGS_4_BAND = ['EE', 'ME', 'AE', 'BE'];
const RATINGS_8_LEVEL = ['EE1', 'EE2', 'ME1', 'ME2', 'AE1', 'AE2', 'BE1', 'BE2'];

async function seedCBC() {
  try {
    await pgClient.connect();
    console.log('Connected to DB');

    // 1. Get Giakanja School ID
    const schoolRes = await pgClient.query("SELECT id FROM schools WHERE subdomain = 'giakanja'");
    if (schoolRes.rows.length === 0) {
      console.error('School Giakanja not found');
      return;
    }
    const schoolId = schoolRes.rows[0].id;
    console.log('Targeting School ID:', schoolId);

    // 2. Add some CBC Learning Areas (Subjects)
    const subjectIds = [];
    for (const area of CBC_LEARNING_AREAS) {
      const subRes = await pgClient.query(`
        INSERT INTO subjects (id, school_id, name)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [crypto.randomUUID(), schoolId, area.name]);
      
      // If nothing inserted (on conflict), fetch the existing ID
      const fetchRes = await pgClient.query(`SELECT id FROM subjects WHERE school_id = $1 AND name = $2`, [schoolId, area.name]);
      subjectIds.push({ id: fetchRes.rows[0].id, name: area.name, strands: area.strands });
    }
    console.log('Learning areas synced');

    // 3. Create a Grade 1 (Primary) and Grade 7 (Junior Secondary) Class
    const class1Id = crypto.randomUUID();
    await pgClient.query(`
      INSERT INTO classes (id, school_id, name, level)
      VALUES ($1, $2, 'Grade 1', 1)
      ON CONFLICT DO NOTHING
    `, [class1Id, schoolId]);

    const class7Id = crypto.randomUUID();
    await pgClient.query(`
      INSERT INTO classes (id, school_id, name, level)
      VALUES ($1, $2, 'Grade 7', 7)
      ON CONFLICT DO NOTHING
    `, [class7Id, schoolId]);

    // 4. Create Streams for them
    const stream1Id = crypto.randomUUID();
    await pgClient.query(`
      INSERT INTO streams (id, school_id, class_id, name)
      VALUES ($1, $2, (SELECT id FROM classes WHERE school_id = $3 AND level = 1 LIMIT 1), 'Alpha')
      ON CONFLICT DO NOTHING
    `, [stream1Id, schoolId, schoolId]);

    const stream7Id = crypto.randomUUID();
    await pgClient.query(`
      INSERT INTO streams (id, school_id, class_id, name)
      VALUES ($1, $2, (SELECT id FROM classes WHERE school_id = $3 AND level = 7 LIMIT 1), 'Beta')
      ON CONFLICT DO NOTHING
    `, [stream7Id, schoolId, schoolId]);

    // 5. Create some students
    const students = [];
    for (let i = 0; i < 10; i++) {
      const pid = crypto.randomUUID();
      const isGrade7 = i % 2 === 0;
      const sId = isGrade7 ? 
        (await pgClient.query(`SELECT id FROM streams WHERE school_id = $1 AND name = 'Beta' LIMIT 1`, [schoolId])).rows[0].id : 
        (await pgClient.query(`SELECT id FROM streams WHERE school_id = $1 AND name = 'Alpha' LIMIT 1`, [schoolId])).rows[0].id;
      const level = isGrade7 ? 7 : 1;

      await pgClient.query(`
        INSERT INTO profiles (id, school_id, full_name, email, role)
        VALUES ($1, $2, $3, $4, 'STUDENT')
        ON CONFLICT DO NOTHING
      `, [pid, schoolId, `CBC Student ${i}`, `cbc${i}@giakanja.co.ke`]);

      await pgClient.query(`
        INSERT INTO students (id, school_id, adm_no, stream_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [pid, schoolId, `CBC-${1000 + i}`, sId]);

      students.push({ id: pid, level });
    }
    console.log('CBC students created');

    // 6. Get a Term and Exam to link to
    const termRes = await pgClient.query(`SELECT id FROM terms WHERE school_id = $1 LIMIT 1`, [schoolId]);
    const termId = termRes.rows[0]?.id;
    
    const examRes = await pgClient.query(`
      INSERT INTO exams (id, school_id, term_id, name, type)
      VALUES ($1, $2, $3, 'CBC Formative Assessment', 'FORMATIVE')
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [crypto.randomUUID(), schoolId, termId]);
    const examId = examRes.rows[0]?.id || (await pgClient.query(`SELECT id FROM exams WHERE school_id = $1 AND type = 'FORMATIVE' LIMIT 1`, [schoolId])).rows[0]?.id;

    // 7. Seed assessments
    for (const student of students) {
      for (const subject of subjectIds) {
        for (const strand of subject.strands) {
          const rating = student.level >= 7 
            ? RATINGS_8_LEVEL[Math.floor(Math.random() * RATINGS_8_LEVEL.length)]
            : RATINGS_4_BAND[Math.floor(Math.random() * RATINGS_4_BAND.length)];
          
          const rawScore = student.level >= 7 ? Math.floor(20 + Math.random() * 80) : null;

          await pgClient.query(`
            INSERT INTO cbc_student_assessments (id, school_id, student_id, exam_id, subject_id, strand, sub_strand, rating, raw_score, teacher_comment, grade_level_at_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [
            crypto.randomUUID(),
            schoolId,
            student.id,
            examId,
            subject.id,
            strand,
            'Sub-strand demonstration',
            rating,
            rawScore,
            'Constructive feedback provided.',
            student.level
          ]);
        }
      }
    }
    console.log('CBC assessments seeded successfully!');

  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await pgClient.end();
  }
}

seedCBC();
