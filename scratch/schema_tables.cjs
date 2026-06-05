const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function getTablesAndCounts() {
  try {
    await client.connect();
    
    // Get tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' AND table_type='BASE TABLE'
    `);
    
    console.log('Tables and Counts:');
    for (let row of tablesRes.rows) {
      const countRes = await client.query(`SELECT COUNT(*) as cnt FROM "${row.table_name}"`);
      console.log(`- ${row.table_name}: ${countRes.rows[0].cnt}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

getTablesAndCounts();
