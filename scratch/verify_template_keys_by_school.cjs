const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
(async () => {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT s.name AS school_name, t.school_id, array_agg(t.key ORDER BY t.key) AS keys
      FROM templates t
      JOIN schools s ON s.id = t.school_id
      WHERE t.archived = false
      GROUP BY s.name, t.school_id
      ORDER BY s.name;
    `);
    console.dir(res.rows, { depth: null });
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
