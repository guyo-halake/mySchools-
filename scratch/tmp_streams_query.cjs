const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
  await c.connect();
  const sql = "select s.name as school_name, c.name as class_name, c.level as class_level, st.name as stream_name from streams st join classes c on c.id = st.class_id join schools s on s.id = c.school_id order by s.name, c.level, c.name, st.name";
  const r = await c.query(sql);
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
