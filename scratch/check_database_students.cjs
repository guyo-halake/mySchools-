const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function checkStudents() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();

  const schoolRes = await client.query("SELECT id FROM schools WHERE subdomain = 'giakanja'");
  if (schoolRes.rows.length === 0) {
    console.log('Giakanja school not found.');
    await client.end();
    return;
  }
  const schoolId = schoolRes.rows[0].id;

  const { rows } = await client.query(`
    SELECT s.adm_no, p.full_name, st.name as stream_name, c.name as class_name
    FROM students s
    JOIN profiles p ON s.id = p.id
    LEFT JOIN streams st ON s.stream_id = st.id
    LEFT JOIN classes c ON st.class_id = c.id
    WHERE s.school_id = $1
    ORDER BY s.adm_no ASC
  `, [schoolId]);

  console.log('--- DATABASE STUDENTS ---');
  console.log('Total Students:', rows.length);
  rows.slice(0, 10).forEach(r => {
    console.log(`[${r.class_name} ${r.stream_name}] ${r.adm_no} - ${r.full_name}`);
  });
  await client.end();
}

checkStudents();
