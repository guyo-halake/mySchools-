const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const canonicalSubjects = [
  { name: 'Mathematics', code: 'MAT', is_compulsory: true, is_elective: false, subject_group: 'STEM', department: 'Mathematics', display_order: 1 },
  { name: 'English', code: 'ENG', is_compulsory: true, is_elective: false, subject_group: 'LANGUAGES', department: 'Languages', display_order: 2 },
  { name: 'Kiswahili', code: 'KIS', is_compulsory: true, is_elective: false, subject_group: 'LANGUAGES', department: 'Languages', display_order: 3 },
  { name: 'Chemistry', code: 'CHE', is_compulsory: true, is_elective: false, subject_group: 'STEM', department: 'Sciences', display_order: 4 },
  { name: 'Biology', code: 'BIO', is_compulsory: false, is_elective: true, subject_group: 'STEM', department: 'Sciences', display_order: 5 },
  { name: 'Physics', code: 'PHY', is_compulsory: false, is_elective: true, subject_group: 'STEM', department: 'Sciences', display_order: 6 },
  { name: 'Business Studies', code: 'BST', is_compulsory: false, is_elective: true, subject_group: 'HUMANITIES', department: 'Business', display_order: 7 },
  { name: 'Agriculture', code: 'AGR', is_compulsory: false, is_elective: true, subject_group: 'TECHNICAL', department: 'Agriculture', display_order: 8 },
  { name: 'History & Government', code: 'H&G', is_compulsory: false, is_elective: true, subject_group: 'HUMANITIES', department: 'Humanities', display_order: 9 },
  { name: 'Geography', code: 'GEO', is_compulsory: false, is_elective: true, subject_group: 'HUMANITIES', department: 'Humanities', display_order: 10 },
  { name: 'CRE', code: 'CRE', is_compulsory: false, is_elective: true, subject_group: 'HUMANITIES', department: 'Religious', display_order: 11 },
  { name: 'IRE', code: 'IRE', is_compulsory: false, is_elective: true, subject_group: 'HUMANITIES', department: 'Religious', display_order: 12 }
];

const gradeScale = [
  { grade: 'A', min: 80, max: 100, point: 12, pass: true, order: 1 },
  { grade: 'A-', min: 75, max: 79, point: 11, pass: true, order: 2 },
  { grade: 'B+', min: 70, max: 74, point: 10, pass: true, order: 3 },
  { grade: 'B', min: 65, max: 69, point: 9, pass: true, order: 4 },
  { grade: 'B-', min: 60, max: 64, point: 8, pass: true, order: 5 },
  { grade: 'C+', min: 55, max: 59, point: 7, pass: true, order: 6 },
  { grade: 'C', min: 50, max: 54, point: 6, pass: true, order: 7 },
  { grade: 'C-', min: 45, max: 49, point: 5, pass: true, order: 8 },
  { grade: 'D+', min: 40, max: 44, point: 4, pass: false, order: 9 },
  { grade: 'D', min: 35, max: 39, point: 3, pass: false, order: 10 },
  { grade: 'D-', min: 30, max: 34, point: 2, pass: false, order: 11 },
  { grade: 'E', min: 0, max: 29, point: 1, pass: false, order: 12 }
];

const randPick = (arr, seed) => arr[Math.abs(seed) % arr.length];

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) - h) + s.charCodeAt(i);
  return h | 0;
};

const gradeFor = (marks) => {
  if (marks >= 80) return 'A';
  if (marks >= 75) return 'A-';
  if (marks >= 70) return 'B+';
  if (marks >= 65) return 'B';
  if (marks >= 60) return 'B-';
  if (marks >= 55) return 'C+';
  if (marks >= 50) return 'C';
  if (marks >= 45) return 'C-';
  if (marks >= 40) return 'D+';
  if (marks >= 35) return 'D';
  if (marks >= 30) return 'D-';
  return 'E';
};

(async () => {
  const c = new Client({ connectionString });
  await c.connect();

  try {
    console.log('Seeding started...');

    const schools = await c.query(`select id from schools order by created_at asc`);

    // Upsert subjects per school
    for (const school of schools.rows) {
      for (const s of canonicalSubjects) {
        await c.query(
          `
          insert into subjects (school_id, name, code, is_compulsory, subject_group, department, is_elective, offered_from_class, offered_to_class, weekly_lessons, pass_mark, display_order, active)
          values ($1,$2,$3,$4,$5,$6,$7,1,4,4,40,$8,true)
          on conflict do nothing
          `,
          [school.id, s.name, s.code, s.is_compulsory, s.subject_group, s.department, s.is_elective, s.display_order]
        );

        await c.query(
          `
          update subjects
          set code = coalesce(code, $3),
              is_compulsory = $4,
              subject_group = coalesce(subject_group, $5),
              department = coalesce(department, $6),
              is_elective = $7,
              offered_from_class = coalesce(offered_from_class, 1),
              offered_to_class = coalesce(offered_to_class, 4),
              pass_mark = coalesce(pass_mark, 40),
              display_order = coalesce(display_order, $8),
              active = true
          where school_id = $1 and lower(name) = lower($2)
          `,
          [school.id, s.name, s.code, s.is_compulsory, s.subject_group, s.department, s.is_elective, s.display_order]
        );
      }

      // Keep old split subjects inactive if combined subject exists
      await c.query(
        `
        update subjects
        set active = false
        where school_id = $1
          and lower(name) in ('history', 'government')
          and exists (
            select 1 from subjects s2
            where s2.school_id = $1 and lower(s2.name) = lower('History & Government')
          )
        `,
        [school.id]
      );
    }

    // Grading systems fill
    for (const school of schools.rows) {
      const latestTerm = await c.query(
        `select id from terms where school_id = $1 order by year desc, end_date desc nulls last, name asc limit 1`,
        [school.id]
      );
      const latestTermId = latestTerm.rows[0]?.id || null;

      for (const g of gradeScale) {
        const existing = await c.query(
          `
          select id from grading_systems
          where school_id = $1 and grade = $2 and min_mark = $3 and max_mark = $4
          limit 1
          `,
          [school.id, g.grade, g.min, g.max]
        );

        if (!existing.rowCount) {
          await c.query(
            `
            insert into grading_systems
              (school_id, min_mark, max_mark, grade, remarks, grade_point, is_pass, sort_order, level, applies_to_class_from, applies_to_class_to, effective_from_term_id)
            values
              ($1,$2,$3,$4,$5,$6,$7,$8,'SECONDARY',1,4,$9)
            `,
            [school.id, g.min, g.max, g.grade, g.pass ? 'Pass' : 'Needs Improvement', g.point, g.pass, g.order, latestTermId]
          );
        } else {
          await c.query(
            `
            update grading_systems
            set grade_point = coalesce(grade_point, $1),
                is_pass = coalesce(is_pass, $2),
                sort_order = coalesce(sort_order, $3),
                level = coalesce(level, 'SECONDARY'),
                applies_to_class_from = coalesce(applies_to_class_from, 1),
                applies_to_class_to = coalesce(applies_to_class_to, 4),
                effective_from_term_id = coalesce(effective_from_term_id, $4)
            where id = $5
            `,
            [g.point, g.pass, g.order, latestTermId, existing.rows[0].id]
          );
        }
      }
    }

    const subjectsBySchool = await c.query(`select id, school_id, name from subjects where active = true`);
    const subjectMap = new Map();
    for (const row of subjectsBySchool.rows) {
      const key = `${row.school_id}::${row.name.toLowerCase()}`;
      subjectMap.set(key, row.id);
    }

    const students = await c.query(`
      select st.id as student_id,
             st.school_id,
             st.adm_no,
             st.stream_id,
             coalesce(cl.level, 1) as class_level,
             sr.class_teacher_id
      from students st
      left join streams sr on sr.id = st.stream_id
      left join classes cl on cl.id = sr.class_id
    `);

    const teachers = await c.query(`select id, school_id from profiles where role='TEACHER'`);
    const teachersBySchool = new Map();
    for (const t of teachers.rows) {
      const arr = teachersBySchool.get(t.school_id) || [];
      arr.push(t.id);
      teachersBySchool.set(t.school_id, arr);
    }

    const examsRaw = await c.query(`
      select e.id, e.school_id, e.type, e.date, t.name as term_name, t.year
      from exams e
      join terms t on t.id = e.term_id
      order by t.year asc, t.name asc, e.type asc, e.id asc
    `);

    const examsBySchool = new Map();
    for (const ex of examsRaw.rows) {
      const m = /Form\s*(\d+)/i.exec(ex.term_name || '');
      if (!m) continue;
      const formLevel = Number(m[1]);
      const key = `${ex.school_id}::${ex.term_name}::${ex.type}`;
      // de-duplicate duplicate terms/exams naming
      if (!examsBySchool.has(key)) {
        examsBySchool.set(key, { ...ex, formLevel });
      }
    }

    const examListBySchool = new Map();
    for (const ex of examsBySchool.values()) {
      const arr = examListBySchool.get(ex.school_id) || [];
      arr.push(ex);
      examListBySchool.set(ex.school_id, arr);
    }

    let enrollmentCount = 0;
    let resultInsertCount = 0;

    for (const st of students.rows) {
      const schoolId = st.school_id;

      const req = [
        'mathematics',
        'english',
        'kiswahili',
        'chemistry'
      ];

      const group1 = ['biology', 'physics'];
      const group2 = ['business studies', 'agriculture', 'physics'];
      const group3 = ['history & government', 'geography'];
      const group4 = ['cre', 'ire'];

      const seed = hash(st.student_id + st.adm_no);
      const chosen = [
        ...req,
        randPick(group1, seed),
        randPick(group2, seed + 11),
        randPick(group3, seed + 29),
        randPick(group4, seed + 47)
      ];

      const uniqueSubjects = [...new Set(chosen)];

      for (const subName of uniqueSubjects) {
        const subjectId = subjectMap.get(`${schoolId}::${subName}`);
        if (!subjectId) continue;

        await c.query(
          `
          insert into student_subjects (student_id, subject_id, school_id)
          values ($1,$2,$3)
          on conflict do nothing
          `,
          [st.student_id, subjectId, schoolId]
        );
        enrollmentCount += 1;
      }

      const teacherPool = teachersBySchool.get(schoolId) || [];
      const teacherId = st.class_teacher_id || teacherPool[0] || null;

      const schoolExams = (examListBySchool.get(schoolId) || []).filter((ex) => ex.formLevel <= Number(st.class_level || 1));
      if (!schoolExams.length) continue;

      const batchId = `seed-${st.student_id.slice(0, 8)}`;

      for (const ex of schoolExams) {
        const weight = ex.type === 'MID_TERM' ? 0.4 : 0.6;

        for (const subName of uniqueSubjects) {
          const subjectId = subjectMap.get(`${schoolId}::${subName}`);
          if (!subjectId) continue;

          const h = hash(`${st.student_id}|${subjectId}|${ex.id}`);
          const marks = 35 + (Math.abs(h) % 61); // 35..95
          const grade = gradeFor(marks);

          await c.query(
            `
            insert into exam_results
              (school_id, student_id, exam_id, subject_id, marks, grade, teacher_id, status, reviewed_by, review_note, published_by, published_at, updated_at, is_absent, is_makeup, score_weight, weighted_score, source_batch_id, attempt_no, locked)
            values
              ($1,$2,$3,$4,$5,$6,$7,'PUBLISHED',$7,'Auto seeded baseline',$7,now(),now(),false,false,$8,$9,$10,1,true)
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
            `,
            [schoolId, st.student_id, ex.id, subjectId, marks, grade, teacherId, weight, Number((marks * weight).toFixed(3)), batchId]
          );

          resultInsertCount += 1;
        }
      }
    }

    console.log('Seeding complete.');
    console.log(`Enroll operations attempted: ${enrollmentCount}`);
    console.log(`Result upserts attempted: ${resultInsertCount}`);

    const coverage = await c.query(`
      select
        (select count(*)::int from students) as students_total,
        (select count(distinct student_id)::int from student_subjects) as students_with_subjects,
        (select count(distinct student_id)::int from exam_results) as students_with_results,
        (select count(*)::int from exam_results) as exam_results_total
    `);
    console.table(coverage.rows);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
