const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function checkCurriculum() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT DISTINCT name, category 
      FROM learning_areas 
      WHERE category IN ('JUNIOR_SECONDARY', 'SENIOR_SECONDARY')
    `);
    console.log('JSS Learning Areas:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkCurriculum();
