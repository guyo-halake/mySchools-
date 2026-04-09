const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function runMigration() {
  const client = new Client({
    connectionString: connectionString,
  });

  try {
    console.log('Connecting to Supabase Database...');
    await client.connect();
    console.log('Connected successfully!');

    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20240409_initial_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing Migration SQL...');
    await client.query(sql);
    console.log('Migration completed successfully! All tables created.');

    // Create a default school to get started
    console.log('Creating default school...');
    const schoolSql = `
      INSERT INTO schools (name, subdomain, email, location)
      VALUES ('Alliance High School', 'alliance', 'info@alliance.ac.ke', 'Kikuyu, Kenya')
      ON CONFLICT (subdomain) DO NOTHING
      RETURNING id;
    `;
    const res = await client.query(schoolSql);
    if (res.rows.length > 0) {
      console.log('Default school created with ID:', res.rows[0].id);
    } else {
      console.log('School already exists.');
    }

  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await client.end();
  }
}

runMigration();
