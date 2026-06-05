const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function inspectFeesColumns() {
  try {
    await client.connect();
    const columnsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fees'
    `);
    console.log('fees table columns:');
    console.table(columnsRes.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

inspectFeesColumns();
