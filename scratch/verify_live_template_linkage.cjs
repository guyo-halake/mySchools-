const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const c = new Client({ connectionString });
  await c.connect();
  try {
    const q = await c.query(`
      select
        count(*)::int as total,
        count(*) filter (where template_key is not null)::int as with_template_key,
        count(*) filter (where template_key = 'TIMETABLE_CLASSES')::int as timetable_linked
      from live_timetable_entries
    `);

    const q2 = await c.query(`
      select count(*)::int as classroom_template_only
      from classroom_sessions
      where template_key = 'TIMETABLE_CLASSES'
    `);

    console.log(JSON.stringify({
      live_linkage: q.rows[0],
      classroom_sessions_template_scoped: q2.rows[0]
    }, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
