const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const pgClient = new Client({ connectionString });

const CBC_STRUCTURE = [
  { level: -2, name: 'PP1', category: 'EARLY_YEARS' },
  { level: -1, name: 'PP2', category: 'EARLY_YEARS' },
  { level: 1, name: 'Grade 1', category: 'PRIMARY' },
  { level: 2, name: 'Grade 2', category: 'PRIMARY' },
  { level: 3, name: 'Grade 3', category: 'PRIMARY' },
  { level: 4, name: 'Grade 4', category: 'PRIMARY' },
  { level: 5, name: 'Grade 5', category: 'PRIMARY' },
  { level: 6, name: 'Grade 6', category: 'PRIMARY' },
  { level: 7, name: 'Grade 7', category: 'JUNIOR_SECONDARY' },
  { level: 8, name: 'Grade 8', category: 'JUNIOR_SECONDARY' },
  { level: 9, name: 'Grade 9', category: 'JUNIOR_SECONDARY' }
];

const SUBJECTS_BY_CAT = {
  'EARLY_YEARS': ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor Activities', 'Religious Education'],
  'PRIMARY': ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Health Education', 'Social Studies', 'CRE/IRE', 'Creative Arts', 'PE'],
  'JUNIOR_SECONDARY': ['Mathematics', 'English', 'Kiswahili', 'Integrated Science', 'Social Studies', 'Pre-Technical Studies', 'Creative Arts & Sports', 'Life Skills Education', 'Agriculture']
};

const STRANDS = ['Strand A', 'Strand B', 'Strand C'];
const SUB_STRANDS = ['Sub-strand 1', 'Sub-strand 2'];

const RATINGS_4_BAND = ['EE', 'ME', 'AE', 'BE'];
const RATINGS_8_LEVEL = ['EE1', 'EE2', 'ME1', 'ME2', 'AE1', 'AE2', 'BE1', 'BE2'];

async function migrateGiakanjaToFullCBC() {
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

    // 2. Ensure all CBC Classes exist
    const classMap = new Map(); // level -> id
    for (const item of CBC_STRUCTURE) {
      const existing = await pgClient.query("SELECT id FROM classes WHERE school_id = $1 AND level = $2", [schoolId, item.level]);
      if (existing.rows.length > 0) {
        await pgClient.query("UPDATE classes SET name = $1 WHERE id = $2", [item.name, existing.rows[0].id]);
        classMap.set(item.level, existing.rows[0].id);
      } else {
        const id = crypto.randomUUID();
        await pgClient.query("INSERT INTO classes (id, school_id, name, level) VALUES ($1, $2, $3, $4)", [id, schoolId, item.name, item.level]);
        classMap.set(item.level, id);
      }
    }
    console.log('CBC Class structure initialized');

    // 3. Ensure Streams exist for each class
    const streamMap = new Map(); // level -> stream_id[]
    for (const level of classMap.keys()) {
      const streams = [];
      for (const sName of ['A', 'B']) {
        const existing = await pgClient.query("SELECT id FROM streams WHERE school_id = $1 AND class_id = $2 AND name = $3", [schoolId, classMap.get(level), sName]);
        if (existing.rows.length > 0) {
          streams.push(existing.rows[0].id);
        } else {
          const id = crypto.randomUUID();
          await pgClient.query("INSERT INTO streams (id, school_id, class_id, name) VALUES ($1, $2, $3, $4)", [id, schoolId, classMap.get(level), sName]);
          streams.push(id);
        }
      }
      streamMap.set(level, streams);
    }
    console.log('Streams initialized for all levels');

    // 4. Update Subjects
    const subjectMap = new Map(); // category -> subject_id[]
    for (const [cat, names] of Object.entries(SUBJECTS_BY_CAT)) {
      const ids = [];
      for (const name of names) {
        const existing = await pgClient.query("SELECT id FROM subjects WHERE school_id = $1 AND name = $2", [schoolId, name]);
        if (existing.rows.length > 0) {
          ids.push(existing.rows[0].id);
        } else {
          const id = crypto.randomUUID();
          await pgClient.query("INSERT INTO subjects (id, school_id, name) VALUES ($1, $2, $3)", [id, schoolId, name]);
          ids.push(id);
        }
      }
      subjectMap.set(cat, ids);
    }
    console.log('Subject catalog updated for CBC');

    // 5. Get all students and redistribute them
    const studentRes = await pgClient.query("SELECT id FROM students WHERE school_id = $1", [schoolId]);
    const studentIds = studentRes.rows.map(r => r.id);
    console.log(`Redistributing ${studentIds.length} students across 11 levels...`);

    const levels = Array.from(classMap.keys());
    for (let i = 0; i < studentIds.length; i++) {
      const sId = studentIds[i];
      const level = levels[i % levels.length];
      const targetStreams = streamMap.get(level);
      const streamId = targetStreams[i % targetStreams.length];

      await pgClient.query("UPDATE students SET stream_id = $1 WHERE id = $2", [streamId, sId]);
    }

    // 6. Generate Assessments for EVERY student
    console.log('Generating assessments (this may take a minute)...');
    
    // Get a term and exam for linkage
    let termId = (await pgClient.query("SELECT id FROM terms WHERE school_id = $1 LIMIT 1", [schoolId])).rows[0]?.id;
    if (!termId) {
      termId = crypto.randomUUID();
      await pgClient.query("INSERT INTO terms (id, school_id, name, year) VALUES ($1, $2, 'CBC Transition Term', 2026)", [termId, schoolId]);
    }

    let examId = (await pgClient.query("SELECT id FROM exams WHERE school_id = $1 AND type = 'SUMMATIVE' LIMIT 1", [schoolId])).rows[0]?.id;
    if (!examId) {
      examId = crypto.randomUUID();
      await pgClient.query("INSERT INTO exams (id, school_id, term_id, name, type) VALUES ($1, $2, $3, 'Annual CBC Assessment', 'SUMMATIVE')", [examId, schoolId, termId]);
    }

    // Process in batches
    for (let i = 0; i < studentIds.length; i++) {
      const studentId = studentIds[i];
      const level = levels[i % levels.length];
      const category = CBC_STRUCTURE.find(c => c.level === level).category;
      const relevantSubjects = subjectMap.get(category);

      for (const subId of relevantSubjects) {
        for (const strand of STRANDS) {
          const rating = category === 'JUNIOR_SECONDARY' 
            ? RATINGS_8_LEVEL[Math.floor(Math.random() * RATINGS_8_LEVEL.length)]
            : RATINGS_4_BAND[Math.floor(Math.random() * RATINGS_4_BAND.length)];
          
          const rawScore = category === 'JUNIOR_SECONDARY' ? Math.floor(15 + Math.random() * 85) : null;

          await pgClient.query(`
            INSERT INTO cbc_student_assessments (id, school_id, student_id, exam_id, subject_id, strand, sub_strand, rating, raw_score, teacher_comment, grade_level_at_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT DO NOTHING
          `, [
            crypto.randomUUID(), schoolId, studentId, examId, subId, strand, SUB_STRANDS[Math.floor(Math.random() * 2)],
            rating, rawScore, 'Achieved competency requirements.', level
          ]);
        }
      }
      if (i % 50 === 0) console.log(`Processed ${i} students...`);
    }

    console.log('✅ Giakanja successfully migrated to full CBC structure with complete population data!');

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pgClient.end();
  }
}

migrateGiakanjaToFullCBC();
