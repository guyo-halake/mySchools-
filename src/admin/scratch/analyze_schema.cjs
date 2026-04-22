const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function analyzeSchema() {
  try {
    await client.connect();
    
    // Get all tables
    const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('TABLES_FOUND:', JSON.stringify(tables));

    for (const table of tables) {
      // Get all columns
      const colsRes = await client.query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position", [table]);
      console.log("SCHEMA_FOR_" + table + ":", JSON.stringify(colsRes.rows));

      // Get foreign keys
      const fkRes = await client.query("SELECT kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name FROM information_schema.key_column_usage AS kcu JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = kcu.constraint_name WHERE kcu.table_name = $1", [table]);
      console.log("FKS_FOR_" + table + ":", JSON.stringify(fkRes.rows));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

analyzeSchema();
