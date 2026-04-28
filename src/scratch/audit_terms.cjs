const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function auditTerms() {
  try {
    await pgClient.connect();
    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    
    const cols = await pgClient.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'terms'");
    console.log('Columns in terms:', cols.rows.map(c => c.column_name));
    
    // Fallback to name/year if specific status column is unknown
    const terms = await pgClient.query("SELECT id, name, year FROM terms WHERE school_id = $1", [schoolId]);
    console.log(terms.rows);

    console.log('\n--- TERM IDs IN FEES TABLE ---');
    const feeTerms = await pgClient.query("SELECT DISTINCT term_id FROM fees WHERE school_id = $1", [schoolId]);
    console.log(feeTerms.rows);

    const termIds = terms.rows.map(t => t.id);
    const feeTermIds = feeTerms.rows.map(t => t.term_id);

    const intersection = termIds.filter(id => feeTermIds.includes(id));
    console.log('\n--- MATCHING TERM IDs ---');
    console.log(intersection);

    if (intersection.length === 0) {
      console.warn('\n[CRITICAL] NO FEE RECORDS MATCH THE TERMS IN THE TERMS TABLE.');
      console.log('Total Fee Records:', (await pgClient.query("SELECT COUNT(*) FROM fees WHERE school_id = $1", [schoolId])).rows[0].count);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await pgClient.end();
  }
}

auditTerms();
