const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

const CBC_STRUCTURE = [
  { name: 'PP1', level: 0, category: 'Pre-Primary' },
  { name: 'PP2', level: 0, category: 'Pre-Primary' },
  { name: 'Grade 1', level: 1, category: 'Lower Primary' },
  { name: 'Grade 2', level: 2, category: 'Lower Primary' },
  { name: 'Grade 3', level: 3, category: 'Lower Primary' },
  { name: 'Grade 4', level: 4, category: 'Upper Primary' },
  { name: 'Grade 5', level: 5, category: 'Upper Primary' },
  { name: 'Grade 6', level: 6, category: 'Upper Primary' },
  { name: 'Grade 7', level: 7, category: 'Junior High School' },
  { name: 'Grade 8', level: 8, category: 'Junior High School' },
  { name: 'Grade 9', level: 9, category: 'Junior High School' }
];

const STREAM_NAMES = ['East', 'West'];
const STUDENTS_PER_STREAM = 10;

async function seedSchool() {
  try {
    await pgClient.connect();
    console.log('Connected to DB...');

    const schoolRes = await pgClient.query("SELECT id FROM schools WHERE subdomain = 'giakanja'");
    if (schoolRes.rows.length === 0) {
      console.error('School Giakanja not found');
      return;
    }
    const schoolId = schoolRes.rows[0].id;
    console.log(`Targeting School ID: ${schoolId}`);

    // --- WIPE OLD DATA ---
    console.log('Wiping old data...');
    // Delete results
    await pgClient.query("DELETE FROM cbc_student_assessments WHERE school_id = $1", [schoolId]);
    await pgClient.query("DELETE FROM results_workflow WHERE school_id = $1", [schoolId]);
    
    // Fetch student IDs before deleting
    const oldStudents = await pgClient.query("SELECT id, parent_id FROM students WHERE school_id = $1", [schoolId]);
    
    await pgClient.query("DELETE FROM students WHERE school_id = $1", [schoolId]);
    
    // Delete streams and classes
    await pgClient.query("DELETE FROM streams WHERE school_id = $1", [schoolId]);
    await pgClient.query("DELETE FROM classes WHERE school_id = $1", [schoolId]);
    console.log('Old data wiped successfully.');

    // --- SEED NEW DATA ---
    console.log('Seeding 11 CBC Classes...');
    
    // Ensure category column exists
    await pgClient.query("ALTER TABLE classes ADD COLUMN IF NOT EXISTS category TEXT;");

    let totalStudentsSeeded = 0;
    let admNoCounter = 2024001;

    for (const cbcClass of CBC_STRUCTURE) {
      const classId = crypto.randomUUID();
      
      // Insert Class
      await pgClient.query(`
        INSERT INTO classes (id, school_id, name, level, category)
        VALUES ($1, $2, $3, $4, $5)
      `, [classId, schoolId, cbcClass.name, cbcClass.level, cbcClass.category]);

      // Insert Streams
      for (const streamName of STREAM_NAMES) {
        const streamId = crypto.randomUUID();
        await pgClient.query(`
          INSERT INTO streams (id, school_id, class_id, name)
          VALUES ($1, $2, $3, $4)
        `, [streamId, schoolId, classId, streamName]);

        // Insert Students & Parents for this stream
        for (let i = 0; i < STUDENTS_PER_STREAM; i++) {
          const parentId = crypto.randomUUID();
          const studentId = crypto.randomUUID();
          const admNo = `CBC-${admNoCounter++}`;

          // Create Parent Profile
          await pgClient.query(`
            INSERT INTO profiles (id, school_id, full_name, email, role)
            VALUES ($1, $2, $3, $4, 'PARENT')
          `, [parentId, schoolId, `Parent of ${admNo}`, `parent${admNo}@giakanja.co.ke`]);

          // Create Student Profile
          await pgClient.query(`
            INSERT INTO profiles (id, school_id, full_name, email, role)
            VALUES ($1, $2, $3, $4, 'STUDENT')
          `, [studentId, schoolId, `Student ${admNo}`, `student${admNo}@giakanja.co.ke`]);

          // Create Student Record mapped to Parent and Stream
          await pgClient.query(`
            INSERT INTO students (id, school_id, adm_no, stream_id, parent_id)
            VALUES ($1, $2, $3, $4, $5)
          `, [studentId, schoolId, admNo, streamId, parentId]);

          totalStudentsSeeded++;
        }
      }
      console.log(`✓ Seeded ${cbcClass.name} (${cbcClass.category}) with ${STREAM_NAMES.length} streams and ${STUDENTS_PER_STREAM * STREAM_NAMES.length} students.`);
    }

    console.log('--- SEEDING COMPLETE ---');
    console.log(`Total Classes: ${CBC_STRUCTURE.length}`);
    console.log(`Total Streams: ${CBC_STRUCTURE.length * STREAM_NAMES.length}`);
    console.log(`Total Students (with Parents): ${totalStudentsSeeded}`);

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pgClient.end();
  }
}

seedSchool();
