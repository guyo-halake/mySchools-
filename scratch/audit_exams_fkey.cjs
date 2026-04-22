const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'exams';
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

audit();
