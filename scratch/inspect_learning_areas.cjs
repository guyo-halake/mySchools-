const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function checkLearningAreas() {
  try {
    await client.connect();
    
    // Check columns in learning_areas
    const columnsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'learning_areas'
    `);
    console.log('learning_areas columns:');
    console.table(columnsRes.rows);

    // Let's see some sample rows
    const rowsRes = await client.query(`
      SELECT id, name, grade_id, class_id FROM learning_areas LIMIT 10
    `);
    console.log('Sample learning areas:');
    console.table(rowsRes.rows);

    // Check how many learning areas are defined per grade/class
    const countByClass = await client.query(`
      SELECT c.name as class_name, COUNT(*) as learning_areas_count
      FROM learning_areas la
      JOIN classes c ON la.class_id = c.id
      GROUP BY c.name
      ORDER BY c.name
    `);
    console.log('Learning Areas count by class:');
    console.table(countByClass.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkLearningAreas();
