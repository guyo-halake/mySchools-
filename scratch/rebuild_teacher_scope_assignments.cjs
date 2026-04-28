const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const c = new Client({ connectionString });
  await c.connect();

  try {
    await c.query('begin');

    await c.query('delete from teacher_subject_stream_assignments');

    await c.query(`
      insert into teacher_subject_stream_assignments (school_id, teacher_id, subject_id, stream_id, class_id, active)
      select distinct
        sm.school_id,
        sm.class_teacher_id,
        subj.id,
        sm.id,
        sm.class_id,
        true
      from streams sm
      join subjects subj
        on subj.school_id = sm.school_id
       and coalesce(subj.active, true) = true
      where sm.class_teacher_id is not null
    `);

    await c.query(`
      insert into teacher_subject_stream_assignments (school_id, teacher_id, subject_id, stream_id, class_id, active)
      select distinct
        rw.school_id,
        rw.submitted_by,
        rw.subject_id,
        rw.stream_id,
        sm.class_id,
        true
      from results_workflow rw
      left join streams sm on sm.id = rw.stream_id
      where rw.submitted_by is not null
      on conflict do nothing
    `);

    const summary = await c.query(`
      select
        school_id,
        count(*)::int as assignment_rows,
        count(distinct teacher_id)::int as teachers_with_scope,
        count(distinct stream_id)::int as streams_covered
      from teacher_subject_stream_assignments
      where active = true
      group by school_id
      order by school_id
    `);

    await c.query('commit');
    console.log('Teacher scope assignments rebuilt successfully.');
    console.table(summary.rows);
  } catch (err) {
    await c.query('rollback');
    console.error('Rebuild failed:', err.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
