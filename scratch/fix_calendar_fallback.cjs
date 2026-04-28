const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
(async () => {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query(`SELECT id, school_id, config FROM templates WHERE key = 'ACADEMIC_CALENDAR_SETUP' AND (config->>'year')::text = '-Infinity'`);
    for (const row of res.rows) {
      const fallbackYear = new Date().getFullYear();
      const config = {
        ...row.config,
        year: fallbackYear,
        yearStartDate: `${fallbackYear}-01-01`,
        yearEndDate: `${fallbackYear}-12-31`,
        terms: [
          { termNumber: 1, name: 'Term 1', startDate: null, endDate: null, midBreakStart: null, midBreakEnd: null, reportDeadline: null, resultsDeadline: null },
          { termNumber: 2, name: 'Term 2', startDate: null, endDate: null, midBreakStart: null, midBreakEnd: null, reportDeadline: null, resultsDeadline: null },
          { termNumber: 3, name: 'Term 3', startDate: null, endDate: null, midBreakStart: null, midBreakEnd: null, reportDeadline: null, resultsDeadline: null }
        ]
      };
      await client.query(`UPDATE templates SET config = $2::jsonb, updated_at = NOW() WHERE id = $1`, [row.id, JSON.stringify(config)]);
      console.log('Fixed fallback calendar config for school', row.school_id);
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
