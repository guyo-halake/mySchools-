const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const sql = `
      update templates
      set config = coalesce(config, '{}'::jsonb)
        || jsonb_build_object(
          'classStartTime', coalesce(config->>'classStartTime', config->>'schoolStartTime', '08:00'),
          'classEndTime', coalesce(config->>'classEndTime', config->>'schoolEndTime', '15:00'),
          'customEntries', coalesce(config->'customEntries', '[]'::jsonb)
        ),
        updated_at = now()
      where key = 'TIMETABLE_CLASSES' and archived = false;
    `;
    const res = await client.query(sql);
    console.log(`Updated rows: ${res.rowCount}`);
  } catch (err) {
    console.error('Repair failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
