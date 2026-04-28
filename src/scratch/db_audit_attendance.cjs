const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const r = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%attendance%'");
    console.log('ATTENDANCE TABLES:', r.rows);
    
    if (r.rows.length > 0) {
      const t = r.rows[0].tablename;
      const columns = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${t}'`);
      console.log(`COLUMNS FOR ${t}:`, columns.rows);
    }
  } finally {
    await client.end();
  }
}

audit();
