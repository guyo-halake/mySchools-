const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
  await c.connect();
  const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
  const classes = await c.query('select count(*)::int as count from classes where school_id = $1', [schoolId]);
  const streams = await c.query('select count(*)::int as count from streams where school_id = $1', [schoolId]);
  console.log(JSON.stringify({ classes: classes.rows[0].count, streams: streams.rows[0].count }, null, 2));
  await c.end();
})().catch((e)=>{console.error(e);process.exit(1)});
