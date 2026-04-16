const { Client } = require('pg');

(async () => {
  const c = new Client({
    connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
  });
  await c.connect();

  const queries = {
    schools: `select id, name from schools order by name`,
    classesBySchool: `
      select s.name as school_name, c.id as class_id, c.name as class_name, c.level
      from classes c
      join schools s on s.id = c.school_id
      order by s.name, c.level nulls last, c.name, c.id
    `,
    classNameCounts: `
      select s.name as school_name, c.name as class_name, count(*) as cnt
      from classes c
      join schools s on s.id = c.school_id
      group by s.name, c.name
      having count(*) > 1
      order by s.name, c.name
    `,
    streamsWithClass: `
      select s.name as school_name, st.id as stream_id, st.name as stream_name, st.class_id,
             c.name as class_name, c.level as class_level
      from streams st
      left join classes c on c.id = st.class_id
      left join schools s on s.id = st.school_id
      order by s.name, c.level nulls last, c.name nulls last, st.name, st.id
    `,
    orphanStreams: `
      select s.name as school_name, st.id as stream_id, st.name as stream_name, st.class_id
      from streams st
      left join classes c on c.id = st.class_id
      left join schools s on s.id = st.school_id
      where st.class_id is null or c.id is null
      order by s.name, st.name
    `,
    streamsOnGenericClass: `
      select s.name as school_name, st.id as stream_id, st.name as stream_name, c.id as class_id, c.name as class_name, c.level
      from streams st
      join classes c on c.id = st.class_id
      join schools s on s.id = st.school_id
      where lower(trim(coalesce(c.name,''))) in ('class', 'classes', '')
      order by s.name, st.name
    `,
    duplicateStreamNamesPerClass: `
      select s.name as school_name, c.name as class_name, st.name as stream_name, count(*) as cnt
      from streams st
      join classes c on c.id = st.class_id
      join schools s on s.id = st.school_id
      group by s.name, c.name, st.name
      having count(*) > 1
      order by s.name, c.name, st.name
    `,
    assignmentMismatch: `
      select tsa.school_id, sch.name as school_name, tsa.teacher_id, tsa.stream_id, tsa.class_id as assignment_class_id,
             st.class_id as stream_class_id,
             case when tsa.class_id is distinct from st.class_id then true else false end as class_mismatch
      from teacher_subject_stream_assignments tsa
      left join streams st on st.id = tsa.stream_id
      left join schools sch on sch.id = tsa.school_id
      where tsa.active = true
      order by sch.name, tsa.teacher_id
    `,
    assignmentMismatchOnly: `
      select tsa.school_id, sch.name as school_name, tsa.teacher_id, tsa.stream_id, tsa.class_id as assignment_class_id,
             st.class_id as stream_class_id
      from teacher_subject_stream_assignments tsa
      left join streams st on st.id = tsa.stream_id
      left join schools sch on sch.id = tsa.school_id
      where tsa.active = true and (st.id is null or tsa.class_id is distinct from st.class_id)
      order by sch.name, tsa.teacher_id
    `,
    rlsClasses: `
      select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname='public' and c.relname in ('classes','streams','teacher_subject_stream_assignments')
      order by c.relname
    `,
    policies: `
      select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      from pg_policies
      where schemaname='public' and tablename in ('classes','streams','teacher_subject_stream_assignments')
      order by tablename, policyname
    `
  };

  for (const [name, sql] of Object.entries(queries)) {
    const r = await c.query(sql);
    console.log(`\n===== ${name} (rows: ${r.rows.length}) =====`);
    console.log(JSON.stringify(r.rows, null, 2));
  }

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
