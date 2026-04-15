const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
(async () => {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query(`
      SELECT p.school_id, p.period_type, p.active_term_id, t.name AS term_name, t.year, p.source, p.as_of_date, p.computed_at
      FROM school_period_state p
      LEFT JOIN terms t ON t.id = p.active_term_id
      ORDER BY p.computed_at DESC
      LIMIT 10;
    `);
    console.dir(result.rows, { depth: null });
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
