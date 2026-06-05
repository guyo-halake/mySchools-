const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

const CBC_LEARNING_AREAS = [
  { name: 'Mathematics', strands: ['Numbers', 'Algebra', 'Geometry'] },
  { name: 'English Language', strands: ['Listening', 'Speaking', 'Reading', 'Writing'] },
  { name: 'Kiswahili Language', strands: ['Kusikiliza', 'Kusoma', 'Kuandika'] },
  { name: 'Environmental Activities', strands: ['Environment', 'Weather', 'Water'] },
  { name: 'Creative Arts', strands: ['Art', 'Music', 'Craft'] }
];

const RATINGS = ['EE', 'ME', 'AE', 'BE'];
const COMMENTS = ['Excellent work.', 'Good progress.', 'Needs to focus more.', 'Showing improvement.'];

async function seedAssessments() {
  try {
    await pgClient.connect();
    console.log('Connected to DB...');

    const schoolRes = await pgClient.query("SELECT id FROM schools WHERE subdomain = 'giakanja'");
    const schoolId = schoolRes.rows[0].id;
    console.log(`Targeting School ID: ${schoolId}`);

    // Get Term & Exam
    const termRes = await pgClient.query("SELECT id FROM terms WHERE school_id = $1 LIMIT 1", [schoolId]);
    const termId = termRes.rows[0]?.id;
    
    let examId = (await pgClient.query("SELECT id FROM exams WHERE school_id = $1 AND type = 'FORMATIVE' LIMIT 1", [schoolId])).rows[0]?.id;
    if (!examId) {
      examId = crypto.randomUUID();
      await pgClient.query("INSERT INTO exams (id, school_id, term_id, name, type) VALUES ($1, $2, $3, 'CBC Formative Assessment', 'FORMATIVE')", [examId, schoolId, termId]);
    }

    // Ensure Subjects exist
    const subjectMap = {};
    for (const area of CBC_LEARNING_AREAS) {
      let subId = (await pgClient.query("SELECT id FROM subjects WHERE school_id = $1 AND name = $2", [schoolId, area.name])).rows[0]?.id;
      if (!subId) {
        subId = crypto.randomUUID();
        await pgClient.query("INSERT INTO subjects (id, school_id, name) VALUES ($1, $2, $3)", [subId, schoolId, area.name]);
      }
      subjectMap[area.name] = subId;
    }

    // Fetch all students with their class levels
    const studentsRes = await pgClient.query(`
      SELECT s.id, s.stream_id, c.level 
      FROM students s
      JOIN streams st ON s.stream_id = st.id
      JOIN classes c ON st.class_id = c.id
      WHERE s.school_id = $1
    `, [schoolId]);
    
    const students = studentsRes.rows;
    console.log(`Found ${students.length} students to assess...`);

    // Wipe old assessments just in case
    await pgClient.query("DELETE FROM cbc_student_assessments WHERE school_id = $1", [schoolId]);

    // Seed Assessments
    let count = 0;
    for (const student of students) {
      for (const area of CBC_LEARNING_AREAS) {
        const subjectId = subjectMap[area.name];
        
        for (const strand of area.strands) {
          const rating = RATINGS[Math.floor(Math.random() * RATINGS.length)];
          const comment = COMMENTS[Math.floor(Math.random() * COMMENTS.length)];
          
          await pgClient.query(`
            INSERT INTO cbc_student_assessments 
            (id, school_id, student_id, exam_id, subject_id, strand, sub_strand, rating, teacher_comment, grade_level_at_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            crypto.randomUUID(), schoolId, student.id, examId, subjectId, 
            strand, `${strand} Basics`, rating, comment, student.level
          ]);
          count++;
        }
      }
    }

    console.log(`Successfully seeded ${count} CBC rubrics across all students!`);

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await pgClient.end();
  }
}

seedAssessments();
