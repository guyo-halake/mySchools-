const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
  await c.connect();

  const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
  const session = await c.query(`select id, teacher_id, stream_id, subject_id from classroom_sessions where school_id = $1 order by created_at desc nulls last limit 1`, [schoolId]);
  if (!session.rows.length) throw new Error('No classroom_sessions row found for test');
  const s = session.rows[0];

  const classIdRow = await c.query(`select class_id from streams where id = $1 limit 1`, [s.stream_id]);
  const classId = classIdRow.rows[0]?.class_id || null;

  const ins = await c.query(`
    insert into classroom_notes (
      school_id, session_id, teacher_id, title, note_type, content, file_url,
      stream_id, class_id, subject_id, audience_scope, target_student_ids, uploaded_by_name
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13
    )
    returning id, school_id, session_id, teacher_id, stream_id, class_id, subject_id, audience_scope, target_student_ids, uploaded_by_name, uploaded_at
  `, [
    schoolId,
    s.id,
    s.teacher_id,
    'METADATA_TEST_NOTE',
    'PDF',
    'metadata test',
    'https://example.com/test.pdf',
    s.stream_id,
    classId,
    s.subject_id,
    'SUBJECT_STUDENTS',
    JSON.stringify(['st-1','st-2']),
    'Metadata Tester'
  ]);

  console.log('INSERTED');
  console.log(JSON.stringify(ins.rows[0], null, 2));

  await c.query(`delete from classroom_notes where id = $1`, [ins.rows[0].id]);
  console.log('CLEANUP_OK');

  await c.end();
})().catch((e)=>{console.error(e);process.exit(1)});
