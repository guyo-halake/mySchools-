const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

(async () => {
  const client = new Client({ connectionString });
  await client.connect();
  const q = await client.query(`select school_id, config from templates where key='TIMETABLE_CLASSES' and archived=false order by school_id`);
  for (const row of q.rows) {
    const cfg = row.config || {};
    console.log(row.school_id, Object.keys(cfg));
    console.log('classStartTime in cfg?', Object.prototype.hasOwnProperty.call(cfg, 'classStartTime'), 'value:', cfg.classStartTime);
    console.log('classEndTime in cfg?', Object.prototype.hasOwnProperty.call(cfg, 'classEndTime'), 'value:', cfg.classEndTime);
    console.log('customEntries in cfg?', Object.prototype.hasOwnProperty.call(cfg, 'customEntries'), 'value:', cfg.customEntries);
  }
  await client.end();
})();
