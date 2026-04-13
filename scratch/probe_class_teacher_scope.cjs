const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const c = new Client({ connectionString });
  await c.connect();

  try {
    const ct = await c.query(`
      select p.id, p.full_name, p.school_id, count(distinct sm.id)::int as owned_streams
      from profiles p
      join streams sm on sm.class_teacher_id = p.id
      where p.role::text ilike '%teacher%'
      group by p.id, p.full_name, p.school_id
      order by owned_streams desc, p.full_name nulls last
      limit 1
    `);

    if (!ct.rows.length) {
      console.log('No class teacher found (by streams.class_teacher_id).');
      return;
    }

    const t = ct.rows[0];

    const allowed = await c.query(`
      select distinct a.stream_id
      from teacher_subject_stream_assignments a
      where a.teacher_id = $1
        and a.school_id = $2
        and a.active = true
    `, [t.id, t.school_id]);

    const owned = await c.query(`
      select id as stream_id
      from streams
      where class_teacher_id = $1
    `, [t.id]);

    const allSchool = await c.query(`
      select id as stream_id
      from streams
      where school_id = $1
    `, [t.school_id]);

    const allowedIds = new Set(allowed.rows.map(r => r.stream_id));
    const ownedIds = new Set(owned.rows.map(r => r.stream_id));

    let ownedCovered = 0;
    for (const id of ownedIds) {
      if (allowedIds.has(id)) ownedCovered += 1;
    }

    const nonOwnedAllowed = [];
    for (const id of allowedIds) {
      if (!ownedIds.has(id)) nonOwnedAllowed.push(id);
    }

    console.log('Class teacher:', t.full_name, t.id);
    console.log('Owned streams:', ownedIds.size);
    console.log('Allowed streams:', allowedIds.size);
    console.log('School streams:', allSchool.rows.length);
    console.log('Owned covered in allowed:', ownedCovered);
    console.log('Non-owned allowed streams count:', nonOwnedAllowed.length);
    console.log('Sample non-owned allowed stream ids:', nonOwnedAllowed.slice(0, 10));
  } finally {
    await c.end();
  }
})();
