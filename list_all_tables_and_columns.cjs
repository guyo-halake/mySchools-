const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function listAllTablesAndColumns() {
  try {
    await pgClient.connect();
    // List all tables in public schema
    const tablesRes = await pgClient.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    if (tablesRes.rows.length === 0) {
      console.log('No tables found in public schema.');
      return;
    }
    for (const row of tablesRes.rows) {
      const table = row.table_name;
      console.log(`Table: ${table}`);
      // List all columns for this table
      const colsRes = await pgClient.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position", [table]);
      for (const col of colsRes.rows) {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      }
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pgClient.end();
  }
}

listAllTablesAndColumns();
