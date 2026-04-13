const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const c = new Client({ connectionString });
  await c.connect();
  try {
    const r = await c.query(`
      select pg_get_functiondef(p.oid) as fn
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where p.proname = 'enforce_results_workflow_rules'
        and n.nspname = 'public'
      limit 1
    `);

    if (!r.rows.length) {
      console.log('Function not found.');
      return;
    }

    console.log(r.rows[0].fn);
  } finally {
    await c.end();
  }
})();
