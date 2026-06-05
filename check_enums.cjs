const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function checkEnums() {
  try {
    await pgClient.connect();
    
    const res = await pgClient.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'exam_type';
    `);
    console.log(res.rows);
    
  } catch (err) {
    console.error(err);
  } finally {
    await pgClient.end();
  }
}

checkEnums();
