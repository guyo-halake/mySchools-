const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function applyMigration() {
  const client = new Client({
    connectionString: connectionString,
  });

  try {
    console.log('🔌 Connecting to Supabase Database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20260413_my_classroom.sql');
    console.log(`📄 Reading migration from: ${sqlPath}`);
    
    if (!fs.existsSync(sqlPath)) {
      console.error('❌ Migration file not found:', sqlPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('⚙️  Executing MyClassroom migration SQL...');
    await client.query(sql);
    console.log('✅ MyClassroom migration completed successfully!');
    console.log('📊 Tables created:');
    console.log('  - classroom_sessions');
    console.log('  - classroom_attendance');
    console.log('  - classroom_hand_queue');
    console.log('  - classroom_spotlight');
    console.log('  - classroom_notes');
    console.log('  - classroom_recordings');
    console.log('  - classroom_assignments');
    console.log('  - classroom_assignment_questions');
    console.log('  - classroom_assignment_submissions');
    console.log('  - classroom_assignment_files');
    console.log('  - classroom_activity_feed ✨');

  } catch (err) {
    console.error('❌ Error during migration:', err.message);
    console.error('Details:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
