const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const c = new Client({ connectionString });
  await c.connect();
  try {
    const checks = [];
    const add = (name, pass, info) => checks.push({ name, pass, info });

    const q1 = await c.query(`
      select count(*)::int as total,
             count(*) filter (where template_key is not null)::int as linked
      from live_timetable_entries
    `);
    add('live_timetable_entries template linkage column active', q1.rows[0].total === q1.rows[0].linked, q1.rows[0]);

    const q2 = await c.query(`
      select count(*)::int as missing_fields
      from templates
      where key='TIMETABLE_CLASSES' and archived=false
      and (
        config->>'classStartTime' is null
        or config->>'classEndTime' is null
        or config->'customEntries' is null
        or config->>'defaultClassLabel' is null
        or config->>'roomPrefix' is null
        or config->>'subjectSelectionLimit' is null
        or config->>'fallbackStreamCount' is null
        or config->>'preferClassTeacherStreams' is null
      )
    `);
    add('template config has all required extended keys', q2.rows[0].missing_fields === 0, q2.rows[0]);

    const q3 = await c.query(`
      select count(*)::int as c
      from template_revisions
      where key='TIMETABLE_CLASSES'
    `);
    add('template revision history exists for timetable', q3.rows[0].c > 0, q3.rows[0]);

    const failed = checks.filter((c) => !c.pass).length;
    console.log(JSON.stringify({ checks, summary: { total: checks.length, failed, passed: checks.length - failed } }, null, 2));
    process.exitCode = failed > 0 ? 2 : 0;
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
