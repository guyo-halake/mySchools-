const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const fs = require('fs');

const pgConnectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const db = new sqlite3.Database('./prisma/dev.db');
const pgClient = new Client({ connectionString: pgConnectionString });

async function migrate() {
  await pgClient.connect();
  console.log('Connected to Supabase');

  // 1. Get Schools
  db.all("SELECT * FROM School", async (err, schools) => {
    if (err) throw err;
    console.log(`Found ${schools.length} schools in SQLite`);
    
    for (const school of schools) {
      // Map to Supabase 'schools' table
      const schoolId = school.id; // Keep original UUID to maintain relations
      await pgClient.query(`
        INSERT INTO schools (id, name, subdomain, email, location, bank_name, bank_acc, paybill_no)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      `, [schoolId, school.name, school.registryCode || `school-${Date.now()}`, school.email, school.location, 'Equity Bank', '0123456789', '247247']);
      
      console.log(`Migrated School: ${school.name}`);
    }

    // 2. Get Users (Profiles)
    db.all("SELECT * FROM User", async (err, users) => {
      if (err) throw err;
      for (const user of users) {
        await pgClient.query(`
          INSERT INTO profiles (id, school_id, full_name, email, role)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [user.id, user.schoolId, user.name, user.email, user.role]);
      }
      console.log(`Migrated ${users.length} user profiles.`);

      // 3. Get Subjects
      db.all("SELECT * FROM Subject", async (err, subjects) => {
        if (err) throw err;
        for (const sub of subjects) {
          await pgClient.query(`
            INSERT INTO subjects (id, school_id, name, code)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO NOTHING
          `, [sub.id, sub.schoolId, sub.name, sub.code]);
        }
        console.log(`Migrated ${subjects.length} subjects.`);

        // 4. Get Classes
        db.all("SELECT * FROM Class", async (err, classes) => {
          if (err) throw err;
          for (const cls of classes) {
             // In new schema, classes are separated from streams. 
             // SQLite has 'Class' as 'Form 1 North'. We'll split it.
             const nameParts = cls.name.split(' ');
             const className = nameParts[0] + ' ' + nameParts[1]; // e.g. 'Form 1'
             const streamName = nameParts[2] || 'A'; // e.g. 'North'
             
             // Create Class first (if not exists)
             const clsRes = await pgClient.query(`
                INSERT INTO classes (school_id, name, level)
                VALUES ($1, $2, $3)
                ON CONFLICT DO NOTHING
                RETURNING id
             `, [cls.schoolId, className, parseInt(nameParts[1]) || 1]);
             
             const pgClassId = clsRes.rows[0]?.id || (await pgClient.query("SELECT id FROM classes WHERE name = $1 AND school_id = $2", [className, cls.schoolId])).rows[0].id;

             // Create Stream
             await pgClient.query(`
                INSERT INTO streams (id, school_id, class_id, name)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO NOTHING
             `, [cls.id, cls.schoolId, pgClassId, streamName]);
          }
          console.log(`Migrated ${classes.length} classes/streams.`);

          // 5. Get Students
          db.all("SELECT * FROM Student", async (err, students) => {
            if (err) throw err;
            for (const st of students) {
              await pgClient.query(`
                INSERT INTO students (id, school_id, adm_no, stream_id, address, guardian_name)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO NOTHING
              `, [st.userId, st.schoolId, st.admissionNumber, st.classId, st.address, st.guardianName]);
            }
            console.log(`Migrated ${students.length} students.`);
            
            console.log('--- ALL DATA MIGRATED ---');
            await pgClient.end();
            db.close();
          });
        });
      });
    });
  });
}

migrate();
