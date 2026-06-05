const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function checkSchema() {
  try {
    await pgClient.connect();
    
    // Check tables related to exams or assessments
    const res = await pgClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%exam%' OR table_name LIKE '%assess%' OR table_name LIKE '%term%')
    `);
    
    console.log("Found tables:");
    for (const row of res.rows) {
      console.log(`- ${row.table_name}`);
      const cols = await pgClient.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [row.table_name]);
      console.log("  Columns:");
      for (const col of cols.rows) {
        console.log(`    ${col.column_name} (${col.data_type})`);
      }
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    await pgClient.end();
  }
}

checkSchema();
