const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function asUser(c, userId) {
  await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
  await c.query(`select set_config('request.jwt.claim.role', 'authenticated', true)`);
}

async function ensureExam(c, schoolId, termId, examType, examName) {
  const found = await c.query(
    `select id from exams where school_id = $1 and term_id = $2 and type = $3 and name = $4 limit 1`,
    [schoolId, termId, examType, examName]
  );
  if (found.rows.length) return found.rows[0].id;

  const created = await c.query(
    `insert into exams (school_id, term_id, type, name, date)
     values ($1,$2,$3,$4,current_date)
     returning id`,
    [schoolId, termId, examType, examName]
  );
  return created.rows[0].id;
}

(async () => {
  const c = new Client({ connectionString });
  await c.connect();

  const runId = Date.now();
  const examName = `WF_RLS_${runId}`;
  const marker = `RLS workflow test draft ${runId}`;

  try {
    await c.query('begin');

    // Build context from real stream/class-teacher assignment and create temporary regular-teacher scope.
    const base = await c.query(`
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
        select term_id from results_workflow where school_id = a.school_id order by created_at desc limit 1
      ) rw on true
      where a.active = true and s.class_teacher_id is not null
      limit 1
    `);

    if (!base.rows.length) throw new Error('No base assignment context found.');
    const ctx = base.rows[0];
    if (!ctx.term_id) throw new Error('No active term found for test context.');

    const regularTeacher = await c.query(
      `select id
       from profiles
       where school_id = $1 and role::text = 'TEACHER' and id <> $2
       limit 1`,
      [ctx.school_id, ctx.class_teacher_id]
    );
    if (!regularTeacher.rows.length) throw new Error('No alternate teacher found for regular-teacher simulation.');

    const regularTeacherId = regularTeacher.rows[0].id;

    await c.query(
      `insert into teacher_subject_stream_assignments (school_id, teacher_id, subject_id, stream_id, class_id, active)
       values ($1,$2,$3,$4,$5,true)
       on conflict do nothing`,
      [ctx.school_id, regularTeacherId, ctx.subject_id, ctx.stream_id, ctx.class_id]
    );

    const student = await c.query(
      `select st.id, st.adm_no
       from students st
       join student_subjects ss on ss.student_id = st.id and ss.subject_id = $2
       where st.school_id = $1 and st.stream_id = $3
       limit 1`,
      [ctx.school_id, ctx.subject_id, ctx.stream_id]
    );
    if (!student.rows.length) throw new Error('No student found in selected stream enrolled in selected subject.');

    const studentId = student.rows[0].id;

    // Regular teacher creates DRAFT.
    await asUser(c, regularTeacherId);
    await c.query(
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
        studentId,
        ctx.subject_id,
        ctx.term_id,
        examName,
        67,
        'B',
        marker,
        regularTeacherId,
        ctx.class_teacher_id,
        `scope:SINGLE;count:1;batch:${runId}`
      ]
    );

    const teacherDraftSeen = await c.query(
      `select count(*)::int as c
       from results_workflow
       where school_id = $1 and remarks = $2 and status = 'DRAFT'`,
      [ctx.school_id, marker]
    );

    // Submit to class teacher.
    await c.query(
      `update results_workflow
       set status = 'SUBMITTED', updated_at = now()
       where school_id = $1 and remarks = $2`,
      [ctx.school_id, marker]
    );

    // Class teacher receives and can hold.
    await asUser(c, ctx.class_teacher_id);
    const classTeacherInboxSeen = await c.query(
      `select count(*)::int as c
       from results_workflow
       where school_id = $1 and remarks = $2 and status = 'SUBMITTED' and class_teacher_id = $3`,
      [ctx.school_id, marker, ctx.class_teacher_id]
    );

    await c.query(
      `update results_workflow
       set status = 'NEEDS_REVISION', review_note = coalesce(review_note,'') || ';hold:yes', updated_at = now()
       where school_id = $1 and remarks = $2`,
      [ctx.school_id, marker]
    );

    const heldSeen = await c.query(
      `select count(*)::int as c
       from results_workflow
       where school_id = $1 and remarks = $2 and status = 'NEEDS_REVISION'`,
      [ctx.school_id, marker]
    );

    // Re-submit and approve.
    await asUser(c, regularTeacherId);
    await c.query(
      `update results_workflow
       set status = 'SUBMITTED', updated_at = now()
       where school_id = $1 and remarks = $2`,
      [ctx.school_id, marker]
    );

    await asUser(c, ctx.class_teacher_id);
    await c.query(
      `update results_workflow
       set status = 'APPROVED', updated_at = now()
       where school_id = $1 and remarks = $2`,
      [ctx.school_id, marker]
    );

    const approvedRow = await c.query(
      `select id, exam_name
       from results_workflow
       where school_id = $1 and remarks = $2 and status = 'APPROVED'
       limit 1`,
      [ctx.school_id, marker]
    );

    if (!approvedRow.rows.length) {
      throw new Error('Approved workflow row not found after class-teacher approval.');
    }

    const resolvedExamName = approvedRow.rows[0].exam_name;

    // Before publish: no main result expected.
    const beforePublish = await c.query(
      `select count(*)::int as c
       from exam_results er
       join exams ex on ex.id = er.exam_id
       where er.school_id = $1
         and er.student_id = $2
         and er.subject_id = $3
         and ex.term_id = $4
         and ex.type = 'MID_TERM'
         and ex.name = $5`,
      [ctx.school_id, studentId, ctx.subject_id, ctx.term_id, resolvedExamName]
    );

    // Publish approved to main results.
    const examId = await ensureExam(c, ctx.school_id, ctx.term_id, 'MID_TERM', resolvedExamName);
    await c.query(
      `insert into exam_results (school_id, student_id, exam_id, subject_id, marks, grade)
       select school_id, student_id, $2, subject_id, marks, grade
       from results_workflow
       where school_id = $1 and remarks = $3 and status = 'APPROVED'`,
      [ctx.school_id, examId, marker]
    );

    await c.query(
      `update results_workflow
       set status = 'PUBLISHED', published_by = $2, published_at = now(), updated_at = now()
       where school_id = $1 and remarks = $3 and status = 'APPROVED'`,
      [ctx.school_id, ctx.class_teacher_id, marker]
    );

    const afterPublish = await c.query(
      `select count(*)::int as c
       from exam_results er
       join exams ex on ex.id = er.exam_id
       where er.school_id = $1
         and er.student_id = $2
         and er.subject_id = $3
         and ex.term_id = $4
         and ex.type = 'MID_TERM'
         and ex.name = $5`,
      [ctx.school_id, studentId, ctx.subject_id, ctx.term_id, resolvedExamName]
    );

    const finalStatus = await c.query(
      `select status
       from results_workflow
       where school_id = $1 and remarks = $2
       order by updated_at desc
       limit 1`,
      [ctx.school_id, marker]
    );

    console.log('=== CONTEXT ===');
    console.table([
      {
        school_id: ctx.school_id,
        regular_teacher_id: regularTeacherId,
        class_teacher_id: ctx.class_teacher_id,
        stream_id: ctx.stream_id,
        subject_id: ctx.subject_id,
        term_id: ctx.term_id,
        student_id: studentId,
        adm_no: student.rows[0].adm_no,
        exam_name_requested: examName,
        exam_name_effective: resolvedExamName
      }
    ]);

    console.log('=== ASSERTIONS ===');
    console.table([
      {
        teacher_draft_visible: teacherDraftSeen.rows[0].c,
        class_teacher_received_submitted: classTeacherInboxSeen.rows[0].c,
        class_teacher_hold_visible: heldSeen.rows[0].c,
        main_results_before_publish: beforePublish.rows[0].c,
        main_results_after_publish: afterPublish.rows[0].c,
        final_workflow_status: finalStatus.rows[0]?.status || 'NONE'
      }
    ]);

    await c.query('rollback');
    console.log('Rolled back all test writes.');
  } catch (err) {
    try { await c.query('rollback'); } catch {}
    console.error('RLS workflow test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
