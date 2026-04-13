const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const c = new Client({ connectionString });
  await c.connect();

  try {
    const roles = await c.query(`
      select distinct role::text as role
      from profiles
      where role::text ilike '%teacher%'
      order by role
    `);

    if (!roles.rows.length) {
      console.log('No teacher-like role found in profiles.');
      return;
    }

    const teacherRole = roles.rows[0].role;

    const teacher = await c.query(`
      select id, full_name, school_id
      from profiles
      where role::text = $1
      order by full_name nulls last
      limit 1
    `, [teacherRole]);

    if (!teacher.rows.length) {
      console.log('No teacher found.');
      return;
    }

    const t = teacher.rows[0];
    console.log('Role used:', teacherRole);
    console.log('Teacher:', t.full_name, t.id);

    const allowed = await c.query(`
      select distinct sm.id as stream_id, sm.name as stream_name, sm.class_id
      from teacher_subject_stream_assignments a
      join streams sm on sm.id = a.stream_id
      where a.teacher_id = $1
        and a.school_id = $2
        and a.active = true
      order by sm.name
    `, [t.id, t.school_id]);

    const allStreams = await c.query(`
      select id as stream_id, name as stream_name, class_id
      from streams
      where school_id = $1
      order by name
    `, [t.school_id]);

    const allowedIds = new Set(allowed.rows.map(r => r.stream_id));
    const blocked = allStreams.rows.filter(r => !allowedIds.has(r.stream_id));

    console.log('Allowed stream count:', allowed.rows.length);
    console.log('Total streams in school:', allStreams.rows.length);
    console.log('Blocked stream count:', blocked.length);
    console.log('Sample allowed:', allowed.rows.slice(0, 5));
    console.log('Sample blocked:', blocked.slice(0, 5));
  } finally {
    await c.end();
  }
})();
