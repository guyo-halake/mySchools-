const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
});

(async () => {
  try {
    await c.connect();

    const q = await c.query(`
      select
        (select count(*)::int from subjects) as subjects_total,
        (select count(*)::int from student_subjects) as student_subject_rows,
        (select count(distinct student_id)::int from student_subjects) as students_with_subjects,
        (select count(*)::int from exam_results) as exam_results_total,
        (select count(distinct student_id)::int from exam_results) as students_with_results,
        (select count(*)::int from results_workflow) as workflow_rows
    `);
    console.log('\n=== coverage ===');
    console.table(q.rows);

    const extras = await c.query(`
      select
        (select count(*)::int from subjects where lower(name)='biology') as biology,
        (select count(*)::int from subjects where lower(name)='agriculture') as agriculture,
        (select count(*)::int from subjects where lower(name)='history & government') as history_gov,
        (select count(*)::int from subjects where lower(name)='ire') as ire,
        (select count(*)::int from exam_results where status='PUBLISHED') as published_results,
        (select count(*)::int from exam_results where locked=true) as locked_results
    `);
    console.log('\n=== subject_and_publish_flags ===');
    console.table(extras.rows);
  } catch (err) {
    console.error('Coverage check failed:', err);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
