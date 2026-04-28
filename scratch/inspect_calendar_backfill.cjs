const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
(async () => {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query(`
      SELECT t.school_id,
             t.id AS template_id,
             t.config,
             (
               SELECT json_agg(json_build_object(
                 'termNumber', CASE
                   WHEN lower(term.name) LIKE '%term 1%' THEN 1
                   WHEN lower(term.name) LIKE '%term 2%' THEN 2
                   WHEN lower(term.name) LIKE '%term 3%' THEN 3
                   ELSE NULL
                 END,
                 'name', term.name,
                 'startDate', to_char(term.start_date, 'YYYY-MM-DD'),
                 'endDate', to_char(term.end_date, 'YYYY-MM-DD')
               ) ORDER BY CASE
                   WHEN lower(term.name) LIKE '%term 1%' THEN 1
                   WHEN lower(term.name) LIKE '%term 2%' THEN 2
                   WHEN lower(term.name) LIKE '%term 3%' THEN 3
                   ELSE 4
                 END)
               FROM terms term
               WHERE term.school_id = t.school_id
                 AND term.year = (
                   SELECT max(year)
                   FROM terms
                   WHERE school_id = t.school_id
                 )
             ) AS terms_json,
             (
               SELECT min(term.start_date)
               FROM terms term
               WHERE term.school_id = t.school_id
                 AND term.year = (
                   SELECT max(year)
                   FROM terms
                   WHERE school_id = t.school_id
                 )
             ) AS year_start,
             (
               SELECT max(term.end_date)
               FROM terms term
               WHERE term.school_id = t.school_id
                 AND term.year = (
                   SELECT max(year)
                   FROM terms
                   WHERE school_id = t.school_id
                 )
             ) AS year_end,
             (
               SELECT max(term.year)
               FROM terms term
               WHERE term.school_id = t.school_id
             ) AS latest_year
      FROM templates t
      WHERE t.key = 'ACADEMIC_CALENDAR_SETUP'
      ORDER BY t.school_id;
    `);
    console.dir(result.rows, { depth: null });
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
