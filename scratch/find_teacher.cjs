const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const GIAKANJA_ID = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  
  const res = await client.query(`
    SELECT id, email, full_name, role, password
    FROM public.profiles 
    WHERE role = 'TEACHER' AND school_id = $1
    LIMIT 3
  `, [GIAKANJA_ID]);
  
  if (res.rows.length > 0) {
    console.log('--- Found Teacher Credentials ---');
    res.rows.forEach(r => {
      console.log(`Name: ${r.full_name}`);
      console.log(`Email: ${r.email}`);
      console.log(`Password: ${r.password}`);
      console.log('---------------------------------');
    });
  } else {
    console.log('No teachers found for this school. Seeding one...');
    // Seed a teacher
    const authId = 'c8b18f0c-432d-45a1-9a72-7489574f8888'; // random UUID
    await client.query(`
      INSERT INTO public.profiles (id, school_id, full_name, email, role, password)
      VALUES ($1, $2, 'Jane Doe', 'jane.doe@example.com', 'TEACHER', 'password123')
      ON CONFLICT (id) DO NOTHING
    `, [authId, GIAKANJA_ID]);
    
    console.log('Created a new teacher:');
    console.log('Email: jane.doe@example.com');
    console.log('Password: password123');
  }
  
  await client.end();
}

main().catch(console.error);
