const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function inspectDbState() {
  try {
    await client.connect();
    
    // 1. Get school ID
    const schoolRes = await client.query("SELECT id FROM schools WHERE subdomain = 'giakanja'");
    const schoolId = schoolRes.rows[0].id;
    console.log('School ID:', schoolId);

    // 2. Count of students with parent_id
    const parentCount = await client.query("SELECT COUNT(*) as count FROM students WHERE school_id = $1 AND parent_id IS NOT NULL", [schoolId]);
    console.log('Students with parent_id:', parentCount.rows[0].count);

    // 3. Check terms
    const termsRes = await client.query("SELECT id, name, year, start_date, end_date FROM terms WHERE school_id = $1 ORDER BY year DESC, start_date DESC", [schoolId]);
    console.log('\nTerms list:');
    console.table(termsRes.rows);

    // 4. Check exams
    const examsRes = await client.query("SELECT id, term_id, name, type FROM exams WHERE school_id = $1", [schoolId]);
    console.log('\nExams list:');
    console.table(examsRes.rows);

    // 5. Check learning areas and their categories
    const laCategories = await client.query("SELECT category, COUNT(*) as count FROM learning_areas WHERE school_id = $1 GROUP BY category", [schoolId]);
    console.log('\nLearning areas by category:');
    console.table(laCategories.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

inspectDbState();
