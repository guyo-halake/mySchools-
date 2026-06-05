const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('Checking user_role enum...');
  const enumRes = await client.query(`
    SELECT unnest(enum_range(NULL::user_role))::text AS role;
  `);
  
  const roles = enumRes.rows.map(r => r.role);
  console.log('Allowed roles:', roles);

  const email = 'guyohalakeofficial@gmail.com';
  const password = 'password123';
  
  const targetRole = roles.includes('SYSTEM_DEVELOPER') ? 'SYSTEM_DEVELOPER' 
                   : roles.includes('DEVELOPER') ? 'DEVELOPER'
                   : roles.includes('SUPER_ADMIN') ? 'SUPER_ADMIN'
                   : 'ADMIN';

  console.log('Selected role:', targetRole);

  const userId = 'da605815-8970-4fb8-9547-137102f9c8bc';

  const schoolRes = await client.query(`SELECT id FROM schools LIMIT 1;`);
  const schoolId = schoolRes.rows[0]?.id || null;

  console.log('Updating profile in DB directly...');
  try {
     const res = await client.query(`
       INSERT INTO profiles (id, school_id, full_name, email, phone, role, password)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET 
         role = EXCLUDED.role,
         full_name = EXCLUDED.full_name,
         school_id = EXCLUDED.school_id,
         email = EXCLUDED.email;
     `, [userId, schoolId, 'Guyo Halake (System Developer)', email, '+254700000000', targetRole, password]);
     console.log('Profile seeded successfully:', res.rowCount);
  } catch (err) {
     console.error('Error inserting profile:', err.message);
  }

  await client.end();
}

main().catch(console.error);
