const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function fixSchema() {
  try {
    await pgClient.connect();
    console.log('Connected to DB. Altering terms table...');
    
    await pgClient.query("ALTER TABLE terms ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false");
    console.log('Column is_current added (or already existed).');

    // Ensure only one term is current per school (optional but good practice)
    // We will let the API handle the switching.
    
    console.log('Migration complete.');
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    await pgClient.end();
  }
}

fixSchema();
