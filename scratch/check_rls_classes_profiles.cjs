const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
  await c.connect();
  const q1 = await c.query(`
    select tablename, policyname, cmd, roles, qual, with_check
    from pg_policies
    where schemaname='public' and tablename in ('classes','profiles','streams')
    order by tablename, policyname
  `);
  console.log('POLICIES');
  console.log(JSON.stringify(q1.rows, null, 2));
  const q2 = await c.query(`
    select n.nspname as schema_name, p.proname, pg_get_functiondef(p.oid) as definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname in ('current_user_school_id') and n.nspname='public'
  `);
  console.log('FUNCTIONS');
  console.log(JSON.stringify(q2.rows, null, 2));
  await c.end();
})().catch((e)=>{console.error(e);process.exit(1)});
