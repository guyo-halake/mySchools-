const { Client } = require('pg');
const fs = require('fs');
const crypto = require('crypto');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function importStudents() {
  try {
    await pgClient.connect();
    console.log('Connected to DB...');

    const schoolRes = await pgClient.query("SELECT id FROM schools WHERE subdomain = 'giakanja'");
    if (schoolRes.rows.length === 0) throw new Error('School not found');
    const schoolId = schoolRes.rows[0].id;

    // Fetch classes and streams mapping
    const streamsRes = await pgClient.query(`
      SELECT st.id as stream_id, st.name as stream_name, c.name as class_name 
      FROM streams st
      JOIN classes c ON st.class_id = c.id
      WHERE st.school_id = $1
    `, [schoolId]);

    const streamMap = {};
    for (const row of streamsRes.rows) {
      const key = `${row.class_name}-${row.stream_name}`;
      streamMap[key] = row.stream_id;
    }

    // Read CSV
    const csvData = fs.readFileSync('students_import.csv', 'utf8');
    const lines = csvData.split('\n').filter(line => line.trim().length > 0);
    
    // Skip header
    const headers = lines[0].split(',');
    
    let count = 0;
    console.log(`Found ${lines.length - 1} records to import...`);

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      if (row.length < 7) continue;

      const studentName = row[0].trim();
      const admNo = row[1].trim();
      const className = row[2].trim();
      const streamName = row[3].trim();
      const parentName = row[4].trim();
      const parentEmail = row[5].trim();
      const dobStr = row[6].trim();

      const streamKey = `${className}-${streamName}`;
      const streamId = streamMap[streamKey];

      if (!streamId) {
        console.warn(`Warning: Could not find stream for ${streamKey}. Skipping ${studentName}.`);
        continue;
      }

      // 1. Create Parent Profile
      const parentId = crypto.randomUUID();
      await pgClient.query(`
        INSERT INTO profiles (id, full_name, email, role, school_id) 
        VALUES ($1, $2, $3, 'PARENT', $4)
      `, [parentId, parentName, parentEmail, schoolId]);

      // 2. Create Student Profile
      const studentId = crypto.randomUUID();
      const studentEmail = `${admNo.toLowerCase().replace('-', '')}@giakanja.co.ke`;
      await pgClient.query(`
        INSERT INTO profiles (id, full_name, email, role, school_id) 
        VALUES ($1, $2, $3, 'STUDENT', $4)
      `, [studentId, studentName, studentEmail, schoolId]);

      // 3. Create Student Record
      await pgClient.query(`
        INSERT INTO students (id, school_id, stream_id, parent_id, adm_no, date_of_birth) 
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [studentId, schoolId, streamId, parentId, admNo, dobStr]);

      count++;
      if (count % 50 === 0) console.log(`Imported ${count} students...`);
    }

    console.log(`--- IMPORT COMPLETE: ${count} students and parents successfully created! ---`);

  } catch (err) {
    console.error('Import failed:', err);
  } finally {
    await pgClient.end();
  }
}

importStudents();
