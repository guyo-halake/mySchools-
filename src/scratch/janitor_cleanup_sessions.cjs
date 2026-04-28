const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function cleanGhostSessions() {
  const client = new Client({ connectionString });
  await client.connect();
  
  try {
    console.log('Starting Database Janitor Service...');
    
    // 1. Identify "Ghost" sessions (Live or Scheduled sessions that are more than 12 hours old)
    const threshold = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    
    console.log(`Finding sessions started before ${threshold} that are still 'LIVE' or 'SCHEDULED'...`);
    
    const { rowCount } = await client.query(`
      UPDATE public.classroom_sessions 
      SET status = 'COMPLETED' 
      WHERE (status = 'LIVE' OR status = 'SCHEDULED' OR status = 'UPCOMING')
      AND created_at < $1
    `, [threshold]);

    console.log(`✅ Success! Cleared ${rowCount} ghost sessions from the database.`);
    console.log('Your "My Class" page will now be clean.');

  } catch (err) {
    console.error('❌ Janitor Error:', err.message);
  } finally {
    await client.end();
  }
}

cleanGhostSessions();
