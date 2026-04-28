const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const pgClient = new Client({ connectionString });

async function setup() {
  try {
    await pgClient.connect();
    console.log('Connected to Supabase...');

    // Create admin_users table
    console.log('Creating admin_users table...');
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        admin_role TEXT NOT NULL CHECK (admin_role IN ('SUPER_ADMIN', 'TECH_ADMIN', 'SALES_ADMIN', 'OPERATIONS_ADMIN')),
        avatar_url TEXT,
        last_login TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Enable RLS
    await pgClient.query('ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;');
    
    // Simple policy: only service role or authenticated (we'll keep it simple for now as it's an internal tool)
    await pgClient.query('DROP POLICY IF EXISTS "Public read" ON admin_users;');
    await pgClient.query('CREATE POLICY "Public read" ON admin_users FOR SELECT USING (true);');

    // Seed Super Admin
    const adminEmail = 'guyesa@matta.africa'; // Using a variation of the user's name/handle
    const adminPass = 'admin123';
    
    console.log('Checking for existing super admin...');
    const check = await pgClient.query('SELECT * FROM admin_users WHERE email = $1', [adminEmail]);
    
    if (check.rows.length === 0) {
      console.log('Seeding super admin...');
      await pgClient.query(`
        INSERT INTO admin_users (full_name, email, password, admin_role)
        VALUES ('Guyesa Admin', $1, $2, 'SUPER_ADMIN')
      `, [adminEmail, adminPass]);
      console.log('--- ADMIN SEEDED ---');
      console.log('Email:', adminEmail);
      console.log('Password:', adminPass);
    } else {
      console.log('Admin already exists.');
    }

  } catch (e) {
    console.error('Setup Error:', e.message);
  } finally {
    await pgClient.end();
  }
}

setup();
