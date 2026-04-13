const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const c = new Client({ connectionString });
  await c.connect();
  try {
    const sql = `
      update templates
      set config = coalesce(config, '{}'::jsonb)
        || jsonb_build_object(
          'defaultClassLabel', coalesce(config->>'defaultClassLabel', 'Class'),
          'roomPrefix', coalesce(config->>'roomPrefix', 'Room'),
          'subjectSelectionLimit', coalesce((config->>'subjectSelectionLimit')::int, 8),
          'fallbackStreamCount', coalesce((config->>'fallbackStreamCount')::int, 2),
          'preferClassTeacherStreams', coalesce((config->>'preferClassTeacherStreams')::boolean, true),
          'enforceLiveSlotAlignment', coalesce((config->>'enforceLiveSlotAlignment')::boolean, true),
          'customEntries', coalesce(config->'customEntries', '[]'::jsonb)
        ),
        updated_at = now()
      where key = 'TIMETABLE_CLASSES' and archived = false;
    `;
    const res = await c.query(sql);
    console.log(`Updated rows: ${res.rowCount}`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
