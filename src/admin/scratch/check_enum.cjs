const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function checkEnum() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE typname = 'user_role'
    `);
    console.log('ENUM_VALUES:', JSON.stringify(res.rows));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkEnum();
