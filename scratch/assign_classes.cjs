const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
async function run(){
  try {
    await client.connect();
    const teacherId = '417040ad-9909-4d72-90c1-7ac0c5117a54'; // Guyo Halake
    
    // Assign Form 1G
    const stream1G = await client.query("SELECT id FROM streams WHERE name = 'G' AND class_id IN (SELECT id FROM classes WHERE name = 'Form 1') LIMIT 1");
    if(stream1G.rows.length > 0){
      await client.query('UPDATE streams SET class_teacher_id = $1 WHERE id = $2', [teacherId, stream1G.rows[0].id]);
      console.log('Linked to Form 1G');
    }

    // Assign Form 4H (to be safe)
    const stream4H = await client.query("SELECT id FROM streams WHERE name = 'H' AND class_id IN (SELECT id FROM classes WHERE name = 'Form 4') LIMIT 1");
    if(stream4H.rows.length > 0){
      await client.query('UPDATE streams SET class_teacher_id = $1 WHERE id = $2', [teacherId, stream4H.rows[0].id]);
      console.log('Linked to Form 4H');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
