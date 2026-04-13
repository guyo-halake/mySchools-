const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
async function run(){
  try {
    await client.connect();
    const streamId = 'e469e795-1d0f-47ac-a489-63c9bce6c454'; // Form 4H
    const res = await client.query('SELECT count(id) FROM students WHERE stream_id = $1', [streamId]);
    console.log(`Live Students in Form 4H: ${res.rows[0].count}`);
    
    const allSt = await client.query('SELECT count(id) FROM students');
    console.log(`Total Students in DB: ${allSt.rows[0].count}`);
    
    // Check one student's stream_id
    const one = await client.query('SELECT stream_id FROM students LIMIT 1');
    console.log(`A Sample Student Stream ID: ${one.rows[0]?.stream_id}`);
    
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
