const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function migrate() {
  try {
    await pgClient.connect();
    console.log('Connected to DB...');

    // 1. Detach Formative Assessments from Legacy Exams
    // We drop the exam_id column from cbc_student_assessments completely.
    try {
      await pgClient.query('ALTER TABLE cbc_student_assessments DROP COLUMN IF EXISTS exam_id CASCADE;');
      console.log('✓ Dropped legacy exam_id from cbc_student_assessments.');
    } catch (err) {
      console.log('Notice: Could not drop exam_id (might already be dropped or have dependencies that require manual cleanup).', err.message);
    }

    // 2. Create cbc_projects table (Summative Assessment Definitions)
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS cbc_projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
          term_id UUID, -- References a term/academic year structure if it exists
          learning_area_id UUID REFERENCES learning_areas(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          deadline DATE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✓ Created cbc_projects table.');

    // 3. Create cbc_project_submissions table (Summative Grading)
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS cbc_project_submissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID REFERENCES cbc_projects(id) ON DELETE CASCADE,
          student_id UUID REFERENCES students(id) ON DELETE CASCADE,
          rubric_rating TEXT NOT NULL, -- e.g., 'EE', 'ME', 'AE', 'BE'
          teacher_comment TEXT,
          evidence_url TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(project_id, student_id)
      );
    `);
    console.log('✓ Created cbc_project_submissions table.');

    console.log('--- DB MIGRATION COMPLETE ---');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pgClient.end();
  }
}

migrate();
