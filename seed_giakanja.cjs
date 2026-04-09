const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const pgClient = new Client({ connectionString });

const KENYAN_NAMES = [
  'Kamau', 'Wanjiku', 'Hassan', 'Otieno', 'Odhiambo', 'Akinyi', 'Kipchumba', 'Chebet',
  'Nyambura', 'Ndungu', 'Mutua', 'Mutuku', 'Njeri', 'Muthoni', 'Ochieng', 'Omondi',
  'Kimani', 'Maina', 'Mwangi', 'Kariuki', 'Njoroge', 'Wachira', 'Waweru', 'Koech',
  'Kiptoo', 'Cheruiyot', 'Lagat', 'Rono', 'Juma', 'Abdalla', 'Omar', 'Fatuma',
  'John', 'David', 'Peter', 'Mary', 'Jane', 'Sarah', 'Grace', 'Alice', 'Michael',
  'Brian', 'Kevin', 'Evans', 'Dennis', 'Daniel', 'Simon', 'Lucy', 'Esther', 'Joy'
];

function getRandomName() {
  const first = KENYAN_NAMES[Math.floor(Math.random() * KENYAN_NAMES.length)];
  const last = KENYAN_NAMES[Math.floor(Math.random() * KENYAN_NAMES.length)];
  return `${first} ${last}`;
}

function getRandomPhone() {
  return `07${Math.floor(10000000 + Math.random() * 90000000)}`;
}

async function seed() {
  try {
    await pgClient.connect();
    console.log('Connected to DB');

    // 1. Create School
    const schoolId = crypto.randomUUID();
    await pgClient.query(`
      INSERT INTO schools (id, name, subdomain, email, location, phone_numbers, bank_name, bank_acc, paybill_no)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (subdomain) DO NOTHING
      RETURNING id
    `, [
      schoolId, 
      'Giakanja School', 
      'giakanja', 
      'principal.rachi@giakanja.co.ke', 
      'Nyeri', 
      [getRandomPhone(), getRandomPhone()], 
      'Equity Bank', 
      '898363', 
      '247247'
    ]);

    // Fetch the school ID just in case it already existed
    const schoolRes = await pgClient.query('SELECT id FROM schools WHERE subdomain = $1', ['giakanja']);
    const actualSchoolId = schoolRes.rows[0].id;
    console.log('School ID:', actualSchoolId);

    // 2. Add Grading System
    const grades = [
      { min: 80, max: 100, grade: 'A', rem: 'Excellent' },
      { min: 75, max: 79, grade: 'A-', rem: 'Very Good' },
      { min: 70, max: 74, grade: 'B+', rem: 'Good' },
      { min: 65, max: 69, grade: 'B', rem: 'Good' },
      { min: 60, max: 64, grade: 'B-', rem: 'Good' },
      { min: 55, max: 59, grade: 'C+', rem: 'Average' },
      { min: 50, max: 54, grade: 'C', rem: 'Average' },
      { min: 45, max: 49, grade: 'C-', rem: 'Fair' },
      { min: 40, max: 44, grade: 'D+', rem: 'Poor' },
      { min: 35, max: 39, grade: 'D', rem: 'Poor' },
      { min: 30, max: 34, grade: 'D-', rem: 'Very Poor' },
      { min: 0, max: 29, grade: 'E', rem: 'Fail' }
    ];
    for (const g of grades) {
      try {
        await pgClient.query(`
          INSERT INTO grading_systems (id, school_id, min_mark, max_mark, grade, remarks)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [crypto.randomUUID(), actualSchoolId, g.min, g.max, g.grade, g.rem]);
      } catch (err) {
        // Ignore if already exists (no explicit unique constraint but might fail if rerun)
      }
    }
    console.log('Added grading system');

    // 3. Add Teachers
    const teacherIds = [];
    for (let i = 0; i < 30; i++) {
      const isPrincipal = (i === 0);
      const tName = isPrincipal ? 'Mr. Rachi' : getRandomName();
      const tRole = isPrincipal ? 'ADMIN' : 'TEACHER';
      const tId = crypto.randomUUID();
      const tEmail = isPrincipal ? 'principal.rachi@giakanja.co.ke' : `teacher${i}@giakanja.co.ke`;
      await pgClient.query(`
        INSERT INTO profiles (id, school_id, full_name, email, phone, role, password)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [tId, actualSchoolId, tName, tEmail, getRandomPhone(), tRole, 'password123']);
      
      if (!isPrincipal) {
        teacherIds.push(tId);
      }
    }
    console.log(`Added ${teacherIds.length + 1} teachers (including principal)`);

    // 4. Add Classes and Streams
    const levels = [1, 2, 3, 4];
    const streamNames = ['G', 'B', 'H', 'S', 'N'];
    let teacherIndex = 0;
    
    let currentAdmNo = 1020;

    for (const lvl of levels) {
      const clsId = crypto.randomUUID();
      await pgClient.query(`
        INSERT INTO classes (id, school_id, name, level)
        VALUES ($1, $2, $3, $4)
      `, [clsId, actualSchoolId, `Form ${lvl}`, lvl]);

      for (const sName of streamNames) {
        const streamId = crypto.randomUUID();
        const classTeacherId = teacherIds[teacherIndex % teacherIds.length];
        teacherIndex++;

        await pgClient.query(`
          INSERT INTO streams (id, school_id, class_id, name, class_teacher_id)
          VALUES ($1, $2, $3, $4, $5)
        `, [streamId, actualSchoolId, clsId, sName, classTeacherId]);

        // 5. Add Students to this Stream
        const numStudents = 20 + Math.floor(Math.random() * 11); // 20 - 30
        for (let st = 0; st < numStudents; st++) {
          const studentProfileId = crypto.randomUUID();
          const studentName = getRandomName();
          
          await pgClient.query(`
            INSERT INTO profiles (id, school_id, full_name, email, role, password)
            VALUES ($1, $2, $3, $4, 'STUDENT', 'password123')
          `, [studentProfileId, actualSchoolId, studentName, `s${currentAdmNo}@giakanja.co.ke`]);

          await pgClient.query(`
            INSERT INTO students (id, school_id, adm_no, stream_id)
            VALUES ($1, $2, $3, $4)
          `, [studentProfileId, actualSchoolId, `GHS-${currentAdmNo}`, streamId]);

          currentAdmNo++;
        }
      }
    }

    console.log(`Added all classes, streams, and a total of ${currentAdmNo - 1020} students!`);

  } catch (e) {
    console.error('Error seeding:', e);
  } finally {
    await pgClient.end();
  }
}

seed();
