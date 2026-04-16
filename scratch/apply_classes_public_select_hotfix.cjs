const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
  await c.connect();
  await c.query(`DROP POLICY IF EXISTS "classes_public_select" ON public.classes;`);
  await c.query(`CREATE POLICY "classes_public_select" ON public.classes FOR SELECT TO public USING (true);`);
  const check = await c.query(`
    select tablename, policyname, cmd, roles, qual
    from pg_policies
    where schemaname='public' and tablename='classes'
    order by policyname
  `);
  console.log(JSON.stringify(check.rows, null, 2));
  await c.end();
})().catch((e)=>{console.error(e);process.exit(1)});
