const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query("SELECT school_id, key, name FROM templates WHERE key = 'ACADEMIC_CALENDAR_SETUP' ORDER BY created_at DESC LIMIT 10");
    console.log(result.rows);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
