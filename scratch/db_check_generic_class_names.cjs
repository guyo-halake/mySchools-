const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
  await c.connect();

  const rows = (await c.query(`
    select s.name as school_name, c.id, c.name, c.level
    from classes c
    join schools s on s.id = c.school_id
    where lower(trim(coalesce(c.name,''))) in ('class','classes','')
    order by s.name, c.id
  `)).rows;

  console.log(JSON.stringify(rows, null, 2));
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
