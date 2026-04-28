const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const c = new Client({ connectionString });
  await c.connect();

  try {
    const r = await c.query(`
      select tgname, pg_get_triggerdef(t.oid) as def
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      where c.relname = 'results_workflow'
        and not t.tgisinternal
      order by tgname
    `);
    console.table(r.rows);
  } finally {
    await c.end();
  }
})();
