const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
  await c.connect();

  const q = async (title, sql) => {
    const r = await c.query(sql);
    console.log(`\n===== ${title} (rows: ${r.rows.length}) =====`);
    console.log(JSON.stringify(r.rows, null, 2));
  };

  await q('current_user_school_id_function', `
    select n.nspname as schema_name, p.proname as function_name,
           pg_get_functiondef(p.oid) as definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'current_user_school_id'
  `);

  await q('profiles_missing_school_id', `
    select id, email, role, school_id
    from profiles
    where school_id is null
    order by email
    limit 50
  `);

  await q('duplicate_active_assignments_exact', `
    select school_id, teacher_id, stream_id, class_id, subject_id, count(*) as cnt
    from teacher_subject_stream_assignments
    where active = true
    group by school_id, teacher_id, stream_id, class_id, subject_id
    having count(*) > 1
    order by cnt desc, school_id
    limit 100
  `);

  await q('assignments_with_null_class_id_active', `
    select school_id, teacher_id, stream_id, class_id, subject_id, active
    from teacher_subject_stream_assignments
    where active = true and class_id is null
    order by school_id, teacher_id
    limit 100
  `);

  await q('constraint_check_classes_streams', `
    select conrelid::regclass::text as table_name,
           conname as constraint_name,
           contype as constraint_type,
           pg_get_constraintdef(oid) as definition
    from pg_constraint
    where conrelid::regclass::text in ('classes','streams','teacher_subject_stream_assignments')
    order by table_name, constraint_name
  `);

  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
