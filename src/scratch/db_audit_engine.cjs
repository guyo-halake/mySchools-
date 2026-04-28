const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('--- DATABASE ARCHITECTURE AUDIT ---');

    // 1. Check Tables
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Public Tables:', tables.rows.map(r => r.table_name));

    // 2. Check for Grading Scales
    const hasScales = tables.rows.some(r => r.table_name === 'grading_scales');
    if (hasScales) {
      const scales = await client.query('SELECT * FROM grading_scales ORDER BY min_marks DESC');
      console.log('Grading Scales:', scales.rows);
    } else {
      console.log('No grading_scales table found. Checking for hardcoded logic in views/functions...');
      const definitions = await client.query("SELECT routine_name, routine_definition FROM information_schema.routines WHERE routine_schema = 'public' AND routine_definition LIKE '%marks%'");
      console.log('Found functions related to marks:', definitions.rows.map(r => r.routine_name));
    }

    // 3. Check for Pre-calculated Averages
    const avgTables = tables.rows.filter(r => r.table_name.includes('average') || r.table_name.includes('mean'));
    console.log('Potential Average Tables:', avgTables);

    for (const t of avgTables) {
      const sample = await client.query(`SELECT * FROM ${t} LIMIT 1`);
      console.log(`Sample from ${t}:`, sample.rows[0]);
    }

    // 4. Check Terms Structure
    const terms = await client.query('SELECT * FROM terms LIMIT 2');
    console.log('Terms Structure:', terms.rows);

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await client.end();
  }
}

audit();
