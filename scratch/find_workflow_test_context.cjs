const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const q = await client.query(`
      select
        rw.school_id,
        rw.stream_id,
        rw.subject_id,
        rw.term_id,
        rw.student_id,
        rw.submitted_by as regular_teacher_id,
        rw.class_teacher_id
      from results_workflow rw
      where rw.submitted_by is not null
        and rw.class_teacher_id is not null
        and rw.submitted_by <> rw.class_teacher_id
      order by rw.updated_at desc
      limit 10
    `);

    console.table(q.rows);
  } finally {
    await client.end();
  }
})();
