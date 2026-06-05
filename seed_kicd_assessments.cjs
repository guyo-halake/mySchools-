const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

const RATINGS = ['EE', 'ME', 'AE', 'BE'];
const COMMENTS = ['Excellent mastery.', 'Meeting expectations.', 'Needs more focus.', 'Great improvement.'];

async function seedAssessments() {
  try {
    await pgClient.connect();
    console.log('Connected to DB...');

    const schoolRes = await pgClient.query("SELECT id FROM schools WHERE subdomain = 'giakanja'");
    const schoolId = schoolRes.rows[0].id;
    console.log(`Targeting School ID: ${schoolId}`);

    // Get Exam
    let examId = (await pgClient.query("SELECT id FROM exams WHERE school_id = $1 AND type = 'FORMATIVE' LIMIT 1", [schoolId])).rows[0]?.id;
    if (!examId) {
      examId = crypto.randomUUID();
      await pgClient.query("INSERT INTO exams (id, school_id, name, type) VALUES ($1, $2, 'KICD Formative', 'FORMATIVE')", [examId, schoolId]);
    }

    // Wipe old assessments
    await pgClient.query("DELETE FROM cbc_student_assessments WHERE school_id = $1", [schoolId]);

    // Fetch learning areas with strands and sub_strands
    const laRes = await pgClient.query("SELECT id, category FROM learning_areas WHERE school_id = $1", [schoolId]);
    
    // Fetch all students with their class category
    const studentsRes = await pgClient.query(`
      SELECT s.id, c.category, c.level
      FROM students s
      JOIN streams st ON s.stream_id = st.id
      JOIN classes c ON st.class_id = c.id
      WHERE s.school_id = $1
    `, [schoolId]);

    let count = 0;
    
    // Seed assessments matching the student's category
    for (const student of studentsRes.rows) {
      const studentAreas = laRes.rows.filter(la => la.category === student.category);
      
      for (const area of studentAreas) {
        const strands = await pgClient.query("SELECT id FROM cbc_strands WHERE learning_area_id = $1", [area.id]);
        
        for (const strand of strands.rows) {
          const subStrands = await pgClient.query("SELECT id FROM cbc_sub_strands WHERE strand_id = $1", [strand.id]);
          
          for (const subStrand of subStrands.rows) {
             const rating = RATINGS[Math.floor(Math.random() * RATINGS.length)];
             const comment = COMMENTS[Math.floor(Math.random() * COMMENTS.length)];
             
             await pgClient.query(`
               INSERT INTO cbc_student_assessments 
               (id, school_id, student_id, exam_id, learning_area_id, strand_id, sub_strand_id, rating, teacher_comment, grade_level_at_time)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             `, [
               crypto.randomUUID(), schoolId, student.id, examId, area.id, 
               strand.id, subStrand.id, rating, comment, student.level
             ]);
             count++;
          }
        }
      }
    }

    console.log(`Successfully seeded ${count} true KICD CBC rubrics!`);

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await pgClient.end();
  }
}

seedAssessments();
