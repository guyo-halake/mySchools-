const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
  await c.connect();
  const sql = "select s.name as school_name, cl.name as class_name from classes cl join schools s on s.id = cl.school_id order by s.name, cl.name";
  const r = await c.query(sql);
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
