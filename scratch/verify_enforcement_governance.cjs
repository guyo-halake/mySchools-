const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const c = new Client({ connectionString });
  await c.connect();

  const controls = await c.query(`
    select school_id, active_term_id, enforce_teacher_scope, enforce_active_term, enforce_exam_window
    from school_result_controls
    order by school_id
  `);
  console.log('controls');
  console.table(controls.rows);

  const windows = await c.query(`
    select school_id, term_id, exam_type::text as exam_type, name, is_open, is_current
    from exam_windows
    where is_current = true
    order by school_id, exam_type
  `);
  console.log('current exam windows');
  console.table(windows.rows);

  const assign = await c.query(`
    select school_id, count(*)::int as assignment_rows, count(distinct teacher_id)::int as teachers_with_scope
    from teacher_subject_stream_assignments
    where active = true
    group by school_id
    order by school_id
  `);
  console.log('teacher assignments');
  console.table(assign.rows);

  const probe = await c.query(`
    with one as (
      select school_id, stream_id, subject_id, submitted_by
      from results_workflow
      limit 1
    )
    select count(*)::int as rows_available from one
  `);
  if (probe.rows[0].rows_available === 0) {
    console.log('No workflow rows to run write probe against; schema and enforcement objects are in place.');
  }

  await c.end();
})();
