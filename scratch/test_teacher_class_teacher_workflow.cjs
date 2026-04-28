const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function ensureExam(client, schoolId, termId, examType, examName) {
  const found = await client.query(
    `select id from exams where school_id = $1 and term_id = $2 and type = $3 and name = $4 limit 1`,
    [schoolId, termId, examType, examName]
  );
  if (found.rows.length) return found.rows[0].id;

  const created = await client.query(
    `insert into exams (school_id, term_id, type, name, date)
     values ($1, $2, $3, $4, current_date)
     returning id`,
    [schoolId, termId, examType, examName]
  );
  return created.rows[0].id;
}

async function pickTestContext(client) {
  const existingPair = await client.query(`
    select
      a.school_id,
      a.teacher_id as regular_teacher_id,
      s.class_teacher_id,
      a.stream_id,
      a.subject_id,
      a.class_id,
      coalesce(ctrl.active_term_id, rw.term_id) as term_id,
      false as temporary_assignment
    from teacher_subject_stream_assignments a
    join streams s on s.id = a.stream_id
    left join school_result_controls ctrl on ctrl.school_id = a.school_id
    left join lateral (
      select term_id
      from results_workflow
      where school_id = a.school_id
      order by created_at desc
      limit 1
    ) rw on true
    where a.active = true
      and s.class_teacher_id is not null
      and a.teacher_id <> s.class_teacher_id
    limit 1
  `);

  if (existingPair.rows.length) return existingPair.rows[0];

  // Build a temporary regular-teacher assignment on a real stream/subject pair.
  const base = await client.query(`
    select
      a.school_id,
      a.stream_id,
      a.subject_id,
      a.class_id,
      s.class_teacher_id,
      coalesce(ctrl.active_term_id, rw.term_id) as term_id
    from teacher_subject_stream_assignments a
    join streams s on s.id = a.stream_id
    left join school_result_controls ctrl on ctrl.school_id = a.school_id
    left join lateral (
      select term_id
      from results_workflow
      where school_id = a.school_id
      order by created_at desc
      limit 1
    ) rw on true
    where a.active = true
      and s.class_teacher_id is not null
    limit 1
  `);

  if (!base.rows.length) {
    throw new Error('No base stream/class-teacher assignment found.');
  }

  const b = base.rows[0];

  const teacher = await client.query(
    `select id
     from profiles
     where school_id = $1
       and role::text = 'TEACHER'
       and id <> $2
     limit 1`,
    [b.school_id, b.class_teacher_id]
  );

  if (!teacher.rows.length) {
    throw new Error('No alternate regular teacher found for temporary assignment.');
  }

  const regularTeacherId = teacher.rows[0].id;

  await client.query(
    `insert into teacher_subject_stream_assignments (school_id, teacher_id, subject_id, stream_id, class_id, active)
     values ($1,$2,$3,$4,$5,true)
     on conflict do nothing`,
    [b.school_id, regularTeacherId, b.subject_id, b.stream_id, b.class_id]
  );

  return {
    school_id: b.school_id,
    regular_teacher_id: regularTeacherId,
    class_teacher_id: b.class_teacher_id,
    stream_id: b.stream_id,
    subject_id: b.subject_id,
    class_id: b.class_id,
    term_id: b.term_id,
    temporary_assignment: true
  };
}

(async () => {
  const client = new Client({ connectionString });
  await client.connect();

  const testRunId = Date.now();
  const examNameMain = `WF_TEST_${testRunId}`;
  const examNameDraft = `WF_DRAFT_ONLY_${testRunId}`;

  try {
    await client.query('begin');

    const ctx = await pickTestContext(client);

    if (!ctx.term_id) {
      throw new Error('No active/known term_id found for workflow test.');
    }

    const studentRow = await client.query(
      `select st.id, st.adm_no
       from students st
       join student_subjects ss on ss.student_id = st.id and ss.subject_id = $2
       where st.school_id = $1 and st.stream_id = $3
       limit 1`,
      [ctx.school_id, ctx.subject_id, ctx.stream_id]
    );

    if (!studentRow.rows.length) {
      throw new Error('No student found in selected stream enrolled in selected subject.');
    }

    const student = studentRow.rows[0];

    // Keep test idempotent if rerun quickly.
    await client.query(`delete from results_workflow where school_id = $1 and exam_name in ($2, $3)`, [ctx.school_id, examNameMain, examNameDraft]);

    // 1) Save draft by regular teacher (stored in workflow only).
    const draftInsertMain = await client.query(
      `insert into results_workflow (
        school_id, stream_id, student_id, subject_id, term_id,
        exam_type, exam_name, marks, grade, remarks,
        status, submitted_by, class_teacher_id, review_note
      ) values (
        $1,$2,$3,$4,$5,
        'MID_TERM',$6,$7,$8,$9,
        'DRAFT',$10,$11,$12
      )`,
      [
        ctx.school_id,
        ctx.stream_id,
        student.id,
        ctx.subject_id,
        ctx.term_id,
        examNameMain,
        64,
        'C',
        'workflow draft test',
        ctx.regular_teacher_id,
        ctx.class_teacher_id,
        `scope:SINGLE;count:1;batch:${testRunId}`
      ]
    );
    console.log('Inserted main draft rows:', draftInsertMain.rowCount);

    // Secondary draft to prove drafts remain outside main results.
    const draftInsertExtra = await client.query(
      `insert into results_workflow (
        school_id, stream_id, student_id, subject_id, term_id,
        exam_type, exam_name, marks, grade, remarks,
        status, submitted_by, class_teacher_id, review_note
      ) values (
        $1,$2,$3,$4,$5,
        'END_TERM',$6,$7,$8,$9,
        'DRAFT',$10,$11,$12
      )`,
      [
        ctx.school_id,
        ctx.stream_id,
        student.id,
        ctx.subject_id,
        ctx.term_id,
        examNameDraft,
        71,
        'B',
        'draft-only should stay in workflow',
        ctx.regular_teacher_id,
        ctx.class_teacher_id,
        `scope:SINGLE;count:1;batch:${testRunId}`
      ]
    );
    console.log('Inserted extra draft rows:', draftInsertExtra.rowCount);

    const immediateCount = await client.query(
      `select count(*)::int as c
       from results_workflow
       where school_id = $1 and exam_name in ($2, $3)`,
      [ctx.school_id, examNameMain, examNameDraft]
    );
    console.log('Immediate workflow row count after inserts:', immediateCount.rows[0].c);

    const draftCheck = await client.query(
      `select
        count(*) filter (where status = 'DRAFT' and exam_name = $2) as main_draft_rows,
        count(*) filter (where status = 'DRAFT' and exam_name = $3) as extra_draft_rows
       from results_workflow
       where school_id = $1 and exam_name in ($2, $3)`,
      [ctx.school_id, examNameMain, examNameDraft]
    );

    // 2) Submit from regular teacher to class teacher inbox.
    await client.query(
      `update results_workflow
       set status = 'SUBMITTED', updated_at = now()
       where school_id = $1 and exam_name = $2 and exam_type = 'MID_TERM'`,
      [ctx.school_id, examNameMain]
    );

    const inboxSubmitted = await client.query(
      `select count(*)::int as submitted_inbox
       from results_workflow
       where school_id = $1
         and class_teacher_id = $2
         and exam_name = $3
         and status = 'SUBMITTED'`,
      [ctx.school_id, ctx.class_teacher_id, examNameMain]
    );

    // 3) Hold/deny by class teacher.
    await client.query(
      `update results_workflow
       set status = 'NEEDS_REVISION', review_note = coalesce(review_note,'') || ';hold:yes', updated_at = now()
       where school_id = $1 and exam_name = $2 and exam_type = 'MID_TERM'`,
      [ctx.school_id, examNameMain]
    );

    const holdCheck = await client.query(
      `select count(*)::int as held_rows
       from results_workflow
       where school_id = $1 and exam_name = $2 and status = 'NEEDS_REVISION'`,
      [ctx.school_id, examNameMain]
    );

    // 4) Re-submit then approve by class teacher.
    await client.query(
      `update results_workflow
       set status = 'SUBMITTED', updated_at = now()
       where school_id = $1 and exam_name = $2 and exam_type = 'MID_TERM'`,
      [ctx.school_id, examNameMain]
    );

    await client.query(
      `update results_workflow
       set status = 'APPROVED', updated_at = now()
       where school_id = $1 and exam_name = $2 and exam_type = 'MID_TERM'`,
      [ctx.school_id, examNameMain]
    );

    const approvedCheck = await client.query(
      `select count(*)::int as approved_rows
       from results_workflow
       where school_id = $1 and exam_name = $2 and status = 'APPROVED'`,
      [ctx.school_id, examNameMain]
    );

    // Before publish, nothing in main exam_results for this exam name.
    const beforePublish = await client.query(
      `select count(*)::int as main_results_before_publish
       from exam_results er
       join exams ex on ex.id = er.exam_id
       where er.school_id = $1 and ex.name = $2`,
      [ctx.school_id, examNameMain]
    );

    // 5) Publish approved row to main results database.
    const examId = await ensureExam(client, ctx.school_id, ctx.term_id, 'MID_TERM', examNameMain);

    await client.query(
      `insert into exam_results (school_id, student_id, exam_id, subject_id, marks, grade)
       select school_id, student_id, $2, subject_id, marks, grade
       from results_workflow
       where school_id = $1 and exam_name = $3 and status = 'APPROVED'`,
      [ctx.school_id, examId, examNameMain]
    );

    await client.query(
      `update results_workflow
       set status = 'PUBLISHED', published_by = $2, published_at = now(), updated_at = now()
       where school_id = $1 and exam_name = $3 and status = 'APPROVED'`,
      [ctx.school_id, ctx.class_teacher_id, examNameMain]
    );

    const afterPublish = await client.query(
      `select count(*)::int as main_results_after_publish
       from exam_results er
       join exams ex on ex.id = er.exam_id
       where er.school_id = $1 and ex.name = $2`,
      [ctx.school_id, examNameMain]
    );

    const finalWorkflow = await client.query(
      `select exam_name, exam_type, status, submitted_by, class_teacher_id
       from results_workflow
       where school_id = $1 and exam_name in ($2, $3)
       order by exam_name, exam_type`,
      [ctx.school_id, examNameMain, examNameDraft]
    );

    console.log('=== TEST CONTEXT ===');
    console.table([
      {
        school_id: ctx.school_id,
        regular_teacher_id: ctx.regular_teacher_id,
        class_teacher_id: ctx.class_teacher_id,
        stream_id: ctx.stream_id,
        subject_id: ctx.subject_id,
        student_id: student.id,
        adm_no: student.adm_no,
        term_id: ctx.term_id,
        temporary_assignment: ctx.temporary_assignment
      }
    ]);

    console.log('=== ASSERTIONS ===');
    console.table([
      {
        main_draft_rows: Number(draftCheck.rows[0].main_draft_rows),
        extra_draft_rows: Number(draftCheck.rows[0].extra_draft_rows),
        submitted_inbox: inboxSubmitted.rows[0].submitted_inbox,
        held_rows: holdCheck.rows[0].held_rows,
        approved_rows: approvedCheck.rows[0].approved_rows,
        main_results_before_publish: beforePublish.rows[0].main_results_before_publish,
        main_results_after_publish: afterPublish.rows[0].main_results_after_publish
      }
    ]);

    console.log('=== WORKFLOW ROWS (proof drafts/submitted/approved/published states) ===');
    console.table(finalWorkflow.rows);

    console.log('PASS CONDITION EXPECTED:');
    console.log('- Draft rows exist in results_workflow.');
    console.log('- Class teacher inbox sees SUBMITTED row.');
    console.log('- HOLD sets NEEDS_REVISION and still no exam_results.');
    console.log('- APPROVED still no exam_results until publish.');
    console.log('- PUBLISH inserts into exam_results and marks workflow row as PUBLISHED.');

    // Roll back test data so this is a clean verification run.
    await client.query('rollback');
    console.log('All test writes rolled back (no permanent data changes).');
  } catch (error) {
    try { await client.query('rollback'); } catch {}
    console.error('Workflow test failed:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
