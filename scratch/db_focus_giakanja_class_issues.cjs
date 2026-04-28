const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
  await c.connect();

  const schoolName = 'Giakanja Boys High School';

  const q = async (title, sql) => {
    const r = await c.query(sql);
    console.log(`\n===== ${title} (rows: ${r.rows.length}) =====`);
    console.log(JSON.stringify(r.rows, null, 2));
  };

  await q('school', `select id, name from schools where name = '${schoolName.replace("'", "''")}'`);

  await q('classes_in_school', `
    select c.id, c.name, c.level
    from classes c
    join schools s on s.id = c.school_id
    where s.name = '${schoolName.replace("'", "''")}'
    order by c.level nulls last, c.name, c.id
  `);

  await q('duplicate_class_names_in_school', `
    select c.name as class_name, count(*) as cnt,
           array_agg(c.id order by c.id) as class_ids
    from classes c
    join schools s on s.id = c.school_id
    where s.name = '${schoolName.replace("'", "''")}'
    group by c.name
    having count(*) > 1
    order by c.name
  `);

  await q('streams_with_joined_class', `
    select st.id as stream_id, st.name as stream_name, st.class_id,
           c.name as class_name, c.level as class_level,
           concat(coalesce(c.name, 'Class'), ' - ', coalesce(st.name, '?')) as ui_label
    from streams st
    join schools s on s.id = st.school_id
    left join classes c on c.id = st.class_id
    where s.name = '${schoolName.replace("'", "''")}'
    order by c.level nulls last, c.name nulls last, st.name, st.id
  `);

  await q('orphan_or_null_class_streams', `
    select st.id as stream_id, st.name as stream_name, st.class_id
    from streams st
    join schools s on s.id = st.school_id
    left join classes c on c.id = st.class_id
    where s.name = '${schoolName.replace("'", "''")}'
      and (st.class_id is null or c.id is null)
    order by st.name, st.id
  `);

  await q('duplicate_stream_names_per_class', `
    select c.name as class_name, st.name as stream_name, count(*) as cnt,
           array_agg(st.id order by st.id) as stream_ids
    from streams st
    join classes c on c.id = st.class_id
    join schools s on s.id = st.school_id
    where s.name = '${schoolName.replace("'", "''")}'
    group by c.name, st.name
    having count(*) > 1
    order by c.name, st.name
  `);

  await q('teacher_assignment_stream_class_mismatches', `
    select tsa.teacher_id, tsa.stream_id, tsa.class_id as assignment_class_id, st.class_id as stream_class_id,
           case when st.id is null then 'MISSING_STREAM' when tsa.class_id is distinct from st.class_id then 'CLASS_ID_MISMATCH' else 'OK' end as status
    from teacher_subject_stream_assignments tsa
    join schools s on s.id = tsa.school_id
    left join streams st on st.id = tsa.stream_id
    where s.name = '${schoolName.replace("'", "''")}' and tsa.active = true
      and (st.id is null or tsa.class_id is distinct from st.class_id)
    order by tsa.teacher_id, tsa.stream_id
  `);

  await q('rls_flags', `
    select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relname in ('classes','streams','teacher_subject_stream_assignments')
    order by c.relname
  `);

  await q('rls_policies', `
    select tablename, policyname, cmd, roles, qual
    from pg_policies
    where schemaname='public' and tablename in ('classes','streams','teacher_subject_stream_assignments')
    order by tablename, policyname
  `);

  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
