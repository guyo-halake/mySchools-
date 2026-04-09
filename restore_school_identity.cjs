const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const pgClient = new Client({ connectionString });

async function restoreSchool() {
  try {
    await pgClient.connect();
    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    
    console.log('Restoring Giakanja Boys High School record...');
    await pgClient.query(`
        INSERT INTO schools (id, name, location, phone_numbers, email, subdomain) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `, [
        schoolId, 
        'Giakanja Boys High School', 
        'Nyeri, Kenya', 
        ['+254 700 000 000'], 
        'info@giakanjaboys.ac.ke',
        'giakanja'
    ]);

    console.log('--- RESTORATION COMPLETE ---');
    console.log('School ID:', schoolId, 'is now LIVE.');
  } catch (e) {
    console.error('Restoration Failure:', e.message);
  } finally {
    await pgClient.end();
  }
}

restoreSchool();
