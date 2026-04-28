const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const pgClient = new Client({ connectionString });

async function seedVIPs() {
  try {
    await pgClient.connect();
    console.log('Connected to DB');

    // 1. Get School ID
    const schoolRes = await pgClient.query("SELECT id FROM schools WHERE subdomain = 'giakanja'");
    if (schoolRes.rows.length === 0) throw new Error('School not found. Run previous seed first.');
    const schoolId = schoolRes.rows[0].id;

    // 2. Add Principal
    const { rows: pExist } = await pgClient.query("SELECT id FROM profiles WHERE email = 'razakwako45@gmail.com'");
    if (pExist.length === 0) {
      await pgClient.query(`
        INSERT INTO profiles (id, school_id, full_name, email, role, password)
        VALUES ($1, $2, 'Mr. Razak (Principal)', 'razakwako45@gmail.com', 'ADMIN', 'guyesa10333')
      `, [crypto.randomUUID(), schoolId]);
    } else {
      await pgClient.query("UPDATE profiles SET password = 'guyesa10333' WHERE email = 'razakwako45@gmail.com'");
    }
    console.log('Principal ready.');

    // 3. Add Teacher
    const { rows: tExist } = await pgClient.query("SELECT id FROM profiles WHERE email = 'guyohalakr@gmail.com'");
    let teacherId;
    if (tExist.length === 0) {
      teacherId = crypto.randomUUID();
      await pgClient.query(`
        INSERT INTO profiles (id, school_id, full_name, email, role, password)
        VALUES ($1, $2, 'guyoteacher', 'guyohalakr@gmail.com', 'TEACHER', 'password123')
      `, [teacherId, schoolId]);
    } else {
      teacherId = tExist[0].id;
    }
    console.log('Teacher ready.');

    // 4. Add Parent
    const { rows: parExist } = await pgClient.query("SELECT id FROM profiles WHERE email = 'guyohalakeofficial@gmail.com'");
    let parentId;
    if (parExist.length === 0) {
      parentId = crypto.randomUUID();
      await pgClient.query(`
        INSERT INTO profiles (id, school_id, full_name, email, phone, role, password)
        VALUES ($1, $2, 'Guyo Halake (Parent)', 'guyohalakeofficial@gmail.com', '0768141129', 'PARENT', 'password123')
      `, [parentId, schoolId]);
    } else {
      parentId = parExist[0].id;
    }
    console.log('Parent ready.');

    // 5. Get/Create Form 4 Class and H Stream
    let classId;
    const classRes = await pgClient.query("SELECT id FROM classes WHERE school_id = $1 AND name = 'Form 4'", [schoolId]);
    if (classRes.rows.length > 0) {
      classId = classRes.rows[0].id;
    } else {
      classId = crypto.randomUUID();
      await pgClient.query("INSERT INTO classes (id, school_id, name, level) VALUES ($1, $2, 'Form 4', 4)", [classId, schoolId]);
    }

    let streamId;
    const streamRes = await pgClient.query("SELECT id FROM streams WHERE class_id = $1 AND name = 'H'", [classId]);
    if (streamRes.rows.length > 0) {
      streamId = streamRes.rows[0].id;
      // Update with class teacher
      await pgClient.query("UPDATE streams SET class_teacher_id = $1 WHERE id = $2", [teacherId, streamId]);
    } else {
      streamId = crypto.randomUUID();
      await pgClient.query("INSERT INTO streams (id, school_id, class_id, name, class_teacher_id) VALUES ($1, $2, $3, 'H', $4)", [streamId, schoolId, classId, teacherId]);
    }
    console.log('Class and Stream configured.');

    // 6. Add Student
    const { rows: stExist } = await pgClient.query("SELECT id FROM profiles WHERE email = 'razanyoo@giakanja.co.ke'");
    let studentProfileId;
    if (stExist.length === 0) {
      studentProfileId = crypto.randomUUID();
      await pgClient.query(`
        INSERT INTO profiles (id, school_id, full_name, email, role, password)
        VALUES ($1, $2, 'Razanyoo', 'razanyoo@giakanja.co.ke', 'STUDENT', 'password123')
      `, [studentProfileId, schoolId]);
      
      await pgClient.query(`
        INSERT INTO students (id, school_id, adm_no, stream_id, parent_id)
        VALUES ($1, $2, 'GHS-7777', $3, $4)
      `, [studentProfileId, schoolId, streamId, parentId]);
    } else {
      studentProfileId = stExist[0].id;
    }
    console.log('Student ready and linked.');

    console.log('--- VIP SEED COMPLETE ---');

  } catch (e) {
    console.error('VIP Seed Error:', e);
  } finally {
    await pgClient.end();
  }
}

seedVIPs();
