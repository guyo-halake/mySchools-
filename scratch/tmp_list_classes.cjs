const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.argv[2] });
  await c.connect();
  const sql = "select s.id as school_id, s.name as school_name, coalesce(string_agg(distinct cl.name, ', ' order by cl.name), '') as class_names, count(distinct cl.id) as class_count from schools s left join classes cl on cl.school_id=s.id group by s.id, s.name order by s.name";
  const r = await c.query(sql);
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
