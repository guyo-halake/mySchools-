const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function checkMapping() {
  try {
    await pgClient.connect();
    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    const feeCounts = await pgClient.query("SELECT count(*), term_id FROM fees WHERE school_id = $1 GROUP BY term_id", [schoolId]);
    console.log('--- Fee Records per Term ID ---');
    console.log(feeCounts.rows);
    
    const terms = await pgClient.query("SELECT id, name, year FROM terms WHERE school_id = $1", [schoolId]);
    const termMap = new Map(terms.rows.map(t => [t.id, t]));
    
    feeCounts.rows.forEach(row => {
      const term = termMap.get(row.term_id);
      console.log(`Term: ${term ? term.name + ' ' + term.year : 'UNKNOWN'} (${row.term_id}) -> ${row.count} fees`);
    });

    const schoolsResult = await pgClient.query("SELECT id, name FROM schools");
    console.log('\n--- Schools found in SCHOOLS table ---');
    console.log(schoolsResult.rows);

    const countResult = await pgClient.query("SELECT count(*) as total, school_id FROM fees GROUP BY school_id");
    console.log('\n--- Fee Counts by School ID ---');
    console.log(countResult.rows);

  } catch (e) {
    console.error(e);
  } finally {
    await pgClient.end();
  }
}

checkMapping();
