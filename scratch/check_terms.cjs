const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });

client.connect().then(async () => {
  try {
    const r1 = await client.query("SELECT unnest(enum_range(NULL::exam_type)) AS type");
    console.log('Exam Types:', r1.rows.map(r=>r.type));
    const r2 = await client.query("SELECT id, name, year FROM terms WHERE school_id = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5' LIMIT 5");
    console.log('Terms:', r2.rows);
  } catch (e) {
    console.error(e);
  } finally {
    client.end();
  }
});
