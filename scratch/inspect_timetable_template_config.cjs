const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const q = await client.query(
      `select school_id, config
       from templates
       where key = 'TIMETABLE_CLASSES' and archived = false
       order by school_id`
    );

    for (const row of q.rows) {
      console.log('SCHOOL', row.school_id);
      console.log(JSON.stringify(row.config, null, 2));
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
