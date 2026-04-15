const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const termNumberFromName = (name) => {
  const lower = String(name || '').toLowerCase();
  if (lower.includes('term 1')) return 1;
  if (lower.includes('term 2')) return 2;
  if (lower.includes('term 3')) return 3;
  return null;
};

(async () => {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const schools = await client.query(`
      SELECT t.school_id, t.id AS template_id
      FROM templates t
      WHERE t.key = 'ACADEMIC_CALENDAR_SETUP'
      ORDER BY t.school_id;
    `);

    for (const row of schools.rows) {
      const termsRes = await client.query(`
        SELECT id, name, year, start_date, end_date
        FROM terms
        WHERE school_id = $1
        ORDER BY year DESC, name ASC;
      `, [row.school_id]);

      const grouped = new Map();
      for (const term of termsRes.rows) {
        if (!grouped.has(term.year)) grouped.set(term.year, []);
        grouped.get(term.year).push(term);
      }

      const latestYear = Math.max(...Array.from(grouped.keys()).map(Number));
      const latestTerms = grouped.get(latestYear) || [];
      const mappedTerms = [1, 2, 3].map((termNumber) => {
        const matched = latestTerms.find((term) => termNumberFromName(term.name) === termNumber) || null;
        return {
          termNumber,
          name: matched?.name || `Term ${termNumber}`,
          startDate: matched?.start_date ? new Date(matched.start_date).toISOString().slice(0, 10) : null,
          endDate: matched?.end_date ? new Date(matched.end_date).toISOString().slice(0, 10) : null,
          midBreakStart: null,
          midBreakEnd: null,
          reportDeadline: null,
          resultsDeadline: null
        };
      });

      const yearStarts = mappedTerms.map((t) => t.startDate).filter(Boolean).sort();
      const yearEnds = mappedTerms.map((t) => t.endDate).filter(Boolean).sort();

      const config = {
        ...(await client.query(`SELECT config FROM templates WHERE id = $1`, [row.template_id])).rows[0].config,
        year: latestYear,
        yearStartDate: yearStarts[0] || `${latestYear}-01-01`,
        yearEndDate: yearEnds[yearEnds.length - 1] || `${latestYear}-12-31`,
        terms: mappedTerms,
        releaseState: 'DRAFT'
      };

      await client.query(`
        UPDATE templates
        SET config = $2::jsonb,
            updated_at = NOW()
        WHERE id = $1;
      `, [row.template_id, JSON.stringify(config)]);

      console.log(`Updated calendar template for school ${row.school_id} (${latestYear})`);
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
