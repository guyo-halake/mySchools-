const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const c = new Client({ connectionString });
  await c.connect();
  try {
    const diff = await c.query(`
      select count(*)::int as cnt
      from teacher_subject_stream_assignments a
      join streams s on s.id = a.stream_id
      where a.active = true
        and s.class_teacher_id is not null
        and a.teacher_id <> s.class_teacher_id
    `);

    const same = await c.query(`
      select count(*)::int as cnt
      from teacher_subject_stream_assignments a
      join streams s on s.id = a.stream_id
      where a.active = true
        and s.class_teacher_id is not null
        and a.teacher_id = s.class_teacher_id
    `);

    console.log('different-teacher-vs-class-teacher rows:', diff.rows[0].cnt);
    console.log('same teacher rows:', same.rows[0].cnt);

    const sample = await c.query(`
      select a.school_id, a.teacher_id, s.class_teacher_id, a.stream_id, a.subject_id, a.class_id
      from teacher_subject_stream_assignments a
      join streams s on s.id = a.stream_id
      where a.active = true
      limit 20
    `);
    console.table(sample.rows);
  } finally {
    await c.end();
  }
})();
