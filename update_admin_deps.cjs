const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    console.log('--- Updating Database ---');
    
    // Add department column
    await client.query('ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS department TEXT;');
    
    // Update existing super admin
    await client.query("UPDATE admin_users SET department = 'Engineering & Tech' WHERE email = 'guyesa@matta.africa';");
    
    // Add a Sales test user
    const existingSales = await client.query("SELECT id FROM admin_users WHERE email = 'sales@p3l.dev'");
    if (existingSales.rows.length === 0) {
      await client.query(`
        INSERT INTO admin_users (full_name, email, password, admin_role, department)
        VALUES ('Sarah Sales', 'sales@p3l.dev', 'sales123', 'SALES_ADMIN', 'Sales & Clients');
      `);
      console.log('Created Sales test user: sales@p3l.dev / sales123');
    }

    // Add a Dev test user
    const existingDev = await client.query("SELECT id FROM admin_users WHERE email = 'dev@p3l.dev'");
    if (existingDev.rows.length === 0) {
      await client.query(`
        INSERT INTO admin_users (full_name, email, password, admin_role, department)
        VALUES ('Mike Dev', 'dev@p3l.dev', 'dev123', 'TECH_ADMIN', 'Engineering & Tech');
      `);
      console.log('Created Dev test user: dev@p3l.dev / dev123');
    }

    console.log('--- Success ---');
  } catch (err) {
    console.error('Update failed:', err);
  } finally {
    await client.end();
  }
}

run();
