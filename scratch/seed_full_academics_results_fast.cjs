const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const c = new Client({ connectionString });

  try {
    await c.connect();
    console.log('Fast fill started...');

    await c.query('begin');

    // Normalize/ensure canonical subjects and metadata per school (idempotent)
    await c.query(`
      with schools as (
        select distinct school_id as id from students where school_id is not null
      ),
      defs(name, code, is_compulsory, subject_group, department, is_elective, display_order) as (
        values
          ('Mathematics','MAT',true,'STEM','Mathematics',false,1),
          ('English','ENG',true,'LANGUAGES','Languages',false,2),
          ('Kiswahili','KIS',true,'LANGUAGES','Languages',false,3),
          ('Chemistry','CHE',true,'STEM','Sciences',false,4),
          ('Biology','BIO',false,'STEM','Sciences',true,5),
          ('Physics','PHY',false,'STEM','Sciences',true,6),
          ('Business Studies','BST',false,'HUMANITIES','Business',true,7),
          ('Agriculture','AGR',false,'TECHNICAL','Agriculture',true,8),
          ('History & Government','H&G',false,'HUMANITIES','Humanities',true,9),
          ('Geography','GEO',false,'HUMANITIES','Humanities',true,10),
          ('CRE','CRE',false,'HUMANITIES','Religious',true,11),
          ('IRE','IRE',false,'HUMANITIES','Religious',true,12)
      )
      insert into subjects (
        school_id, name, code, is_compulsory, subject_group, department,
        is_elective, offered_from_class, offered_to_class, weekly_lessons,
        pass_mark, display_order, active
      )
      select s.id, d.name, d.code, d.is_compulsory, d.subject_group, d.department,
             d.is_elective, 1, 4, 4, 40, d.display_order, true
      from schools s
      cross join defs d
      where not exists (
        select 1 from subjects x where x.school_id = s.id and lower(x.name) = lower(d.name)
      )
    `);

    await c.query(`
      with defs(name, code, is_compulsory, subject_group, department, is_elective, display_order) as (
        values
          ('Mathematics','MAT',true,'STEM','Mathematics',false,1),
          ('English','ENG',true,'LANGUAGES','Languages',false,2),
          ('Kiswahili','KIS',true,'LANGUAGES','Languages',false,3),
          ('Chemistry','CHE',true,'STEM','Sciences',false,4),
          ('Biology','BIO',false,'STEM','Sciences',true,5),
          ('Physics','PHY',false,'STEM','Sciences',true,6),
          ('Business Studies','BST',false,'HUMANITIES','Business',true,7),
          ('Agriculture','AGR',false,'TECHNICAL','Agriculture',true,8),
          ('History & Government','H&G',false,'HUMANITIES','Humanities',true,9),
          ('Geography','GEO',false,'HUMANITIES','Humanities',true,10),
          ('CRE','CRE',false,'HUMANITIES','Religious',true,11),
          ('IRE','IRE',false,'HUMANITIES','Religious',true,12)
      )
      update subjects s
      set code = coalesce(s.code, d.code),
          is_compulsory = d.is_compulsory,
          subject_group = coalesce(s.subject_group, d.subject_group),
          department = coalesce(s.department, d.department),
          is_elective = d.is_elective,
          offered_from_class = coalesce(s.offered_from_class, 1),
          offered_to_class = coalesce(s.offered_to_class, 4),
          pass_mark = coalesce(s.pass_mark, 40),
          display_order = coalesce(s.display_order, d.display_order),
          active = true
      from defs d
      where lower(s.name) = lower(d.name)
    `);

    // Build deterministic subject plan and enroll all students
    await c.query(`
      with normalized_subjects as (
        select distinct on (school_id, lower(name))
               school_id, lower(name) as nname, id
        from subjects
        where active = true
        order by school_id, lower(name), display_order nulls last, id
      ),
      students_base as (
        select st.id as student_id, st.school_id, st.adm_no
        from students st
      ),
      picks as (
        select sb.student_id, sb.school_id,
               unnest(array[
                 'mathematics',
                 'english',
                 'kiswahili',
                 'chemistry',
                 (array['biology','physics'])[1 + (abs(hashtext(sb.student_id::text || '|g1')) % 2)],
                 (array['business studies','agriculture','physics'])[1 + (abs(hashtext(sb.student_id::text || '|g2')) % 3)],
                 (array['history & government','geography'])[1 + (abs(hashtext(sb.student_id::text || '|g3')) % 2)],
                 (array['cre','ire'])[1 + (abs(hashtext(sb.student_id::text || '|g4')) % 2)]
               ]) as chosen_name
        from students_base sb
      ),
      resolved as (
        select distinct p.student_id, ns.id as subject_id, p.school_id
        from picks p
        join normalized_subjects ns
          on ns.school_id = p.school_id
         and ns.nname = p.chosen_name
      )
      insert into student_subjects (student_id, subject_id, school_id)
      select r.student_id, r.subject_id, r.school_id
      from resolved r
      on conflict do nothing
    `);

    // Fill grading systems new columns for existing rows
    await c.query(`
      update grading_systems gs
      set grade_point = coalesce(gs.grade_point,
            case gs.grade
              when 'A' then 12 when 'A-' then 11 when 'B+' then 10 when 'B' then 9
              when 'B-' then 8 when 'C+' then 7 when 'C' then 6 when 'C-' then 5
              when 'D+' then 4 when 'D' then 3 when 'D-' then 2 else 1 end),
          is_pass = coalesce(gs.is_pass, case when gs.min_mark >= 50 then true else false end),
          sort_order = coalesce(gs.sort_order,
            case gs.grade
              when 'A' then 1 when 'A-' then 2 when 'B+' then 3 when 'B' then 4
              when 'B-' then 5 when 'C+' then 6 when 'C' then 7 when 'C-' then 8
              when 'D+' then 9 when 'D' then 10 when 'D-' then 11 else 12 end),
          level = coalesce(gs.level, 'SECONDARY'),
          applies_to_class_from = coalesce(gs.applies_to_class_from, 1),
          applies_to_class_to = coalesce(gs.applies_to_class_to, 4)
    `);

    // Upsert exam results for every student based on form progression and enrolled subjects
    await c.query(`
      with normalized_subjects as (
        select distinct on (school_id, lower(name))
               school_id, lower(name) as nname, id
        from subjects
        where active = true
        order by school_id, lower(name), display_order nulls last, id
      ),
      exams_dedup as (
        select distinct on (e.school_id, t.name, e.type)
               e.id as exam_id,
               e.school_id,
               e.type,
               e.date,
               t.name as term_name,
               t.year,
               coalesce((regexp_match(t.name, 'Form\\s*(\\d+)'))[1]::int, 1) as form_level
        from exams e
        join terms t on t.id = e.term_id
        order by e.school_id, t.name, e.type, e.id
      ),
      students_base as (
        select st.id as student_id,
               st.school_id,
               st.adm_no,
               st.stream_id,
               coalesce(cl.level, 1) as class_level,
               sr.class_teacher_id,
               coalesce(tf.teacher_id, sr.class_teacher_id) as fallback_teacher
        from students st
        left join streams sr on sr.id = st.stream_id
        left join classes cl on cl.id = sr.class_id
        left join lateral (
          select p.id as teacher_id
          from profiles p
          where p.school_id = st.school_id and p.role = 'TEACHER'
          order by p.id
          limit 1
        ) tf on true
      ),
      student_exams as (
        select sb.student_id, sb.school_id, sb.fallback_teacher as teacher_id, ex.exam_id, ex.type,
               ('seed-' || left(sb.student_id::text, 8)) as batch_id
        from students_base sb
        join exams_dedup ex
          on ex.school_id = sb.school_id
         and ex.form_level <= sb.class_level
      ),
      student_subjects_resolved as (
        select ss.student_id, ss.subject_id, st.school_id
        from student_subjects ss
        join students st on st.id = ss.student_id
      ),
      payload as (
        select se.school_id,
               se.student_id,
               se.exam_id,
               ss.subject_id,
               (35 + (abs(hashtext(se.student_id::text || '|' || ss.subject_id::text || '|' || se.exam_id::text)) % 61))::numeric(5,2) as marks,
               case
                 when (35 + (abs(hashtext(se.student_id::text || '|' || ss.subject_id::text || '|' || se.exam_id::text)) % 61)) >= 80 then 'A'
                 when (35 + (abs(hashtext(se.student_id::text || '|' || ss.subject_id::text || '|' || se.exam_id::text)) % 61)) >= 75 then 'A-'
                 when (35 + (abs(hashtext(se.student_id::text || '|' || ss.subject_id::text || '|' || se.exam_id::text)) % 61)) >= 70 then 'B+'
                 when (35 + (abs(hashtext(se.student_id::text || '|' || ss.subject_id::text || '|' || se.exam_id::text)) % 61)) >= 65 then 'B'
                 when (35 + (abs(hashtext(se.student_id::text || '|' || ss.subject_id::text || '|' || se.exam_id::text)) % 61)) >= 60 then 'B-'
                 when (35 + (abs(hashtext(se.student_id::text || '|' || ss.subject_id::text || '|' || se.exam_id::text)) % 61)) >= 55 then 'C+'
                 when (35 + (abs(hashtext(se.student_id::text || '|' || ss.subject_id::text || '|' || se.exam_id::text)) % 61)) >= 50 then 'C'
                 when (35 + (abs(hashtext(se.student_id::text || '|' || ss.subject_id::text || '|' || se.exam_id::text)) % 61)) >= 45 then 'C-'
                 when (35 + (abs(hashtext(se.student_id::text || '|' || ss.subject_id::text || '|' || se.exam_id::text)) % 61)) >= 40 then 'D+'
                 when (35 + (abs(hashtext(se.student_id::text || '|' || ss.subject_id::text || '|' || se.exam_id::text)) % 61)) >= 35 then 'D'
                 when (35 + (abs(hashtext(se.student_id::text || '|' || ss.subject_id::text || '|' || se.exam_id::text)) % 61)) >= 30 then 'D-'
                 else 'E'
               end as grade,
               se.teacher_id,
               case when se.type = 'MID_TERM' then 0.4 else 0.6 end as score_weight,
               round(((35 + (abs(hashtext(se.student_id::text || '|' || ss.subject_id::text || '|' || se.exam_id::text)) % 61))
                 * (case when se.type = 'MID_TERM' then 0.4 else 0.6 end))::numeric, 3) as weighted_score,
               se.batch_id
        from student_exams se
        join student_subjects_resolved ss
          on ss.student_id = se.student_id
      )
      insert into exam_results (
        school_id, student_id, exam_id, subject_id, marks, grade,
        teacher_id, status, reviewed_by, review_note, published_by, published_at,
        updated_at, is_absent, is_makeup, score_weight, weighted_score,
        source_batch_id, attempt_no, locked
      )
      select
        p.school_id, p.student_id, p.exam_id, p.subject_id, p.marks, p.grade,
        p.teacher_id, 'PUBLISHED'::result_entry_status, p.teacher_id,
        'Auto seeded baseline', p.teacher_id, now(),
        now(), false, false, p.score_weight, p.weighted_score,
        p.batch_id, 1, true
      from payload p
      on conflict (student_id, subject_id, exam_id, attempt_no)
      do update
      set marks = excluded.marks,
          grade = excluded.grade,
          teacher_id = excluded.teacher_id,
          status = 'PUBLISHED',
          reviewed_by = excluded.reviewed_by,
          review_note = excluded.review_note,
          published_by = excluded.published_by,
          published_at = excluded.published_at,
          updated_at = now(),
          is_absent = false,
          is_makeup = false,
          score_weight = excluded.score_weight,
          weighted_score = excluded.weighted_score,
          source_batch_id = excluded.source_batch_id,
          locked = true
    `);

    await c.query('commit');

    const coverage = await c.query(`
      select
        (select count(*)::int from students) as students_total,
        (select count(*)::int from subjects where active=true) as active_subjects,
        (select count(distinct student_id)::int from student_subjects) as students_with_subjects,
        (select count(distinct student_id)::int from exam_results) as students_with_results,
        (select count(*)::int from exam_results) as exam_results_total
    `);

    console.log('Fast fill complete.');
    console.table(coverage.rows);
  } catch (err) {
    try { await c.query('rollback'); } catch (_) {}
    console.error('Fast fill failed:', err);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
