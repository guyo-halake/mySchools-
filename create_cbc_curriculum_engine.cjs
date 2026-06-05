const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function migrate() {
  try {
    await pgClient.connect();
    console.log('Connected to DB. Starting Curriculum Engine migration...');

    // 1. Create learning_areas
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS learning_areas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );
    `);
    console.log('✓ Created learning_areas table');

    // 2. Create cbc_strands
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS cbc_strands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        learning_area_id UUID REFERENCES learning_areas(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );
    `);
    console.log('✓ Created cbc_strands table');

    // 3. Create cbc_sub_strands
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS cbc_sub_strands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        strand_id UUID REFERENCES cbc_strands(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );
    `);
    console.log('✓ Created cbc_sub_strands table');

    // 4. Create cbc_extra_strands
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS cbc_extra_strands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
        learning_area_id UUID REFERENCES learning_areas(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );
    `);
    console.log('✓ Created cbc_extra_strands table');

    // 5. Update cbc_student_assessments
    await pgClient.query(`ALTER TABLE cbc_student_assessments ADD COLUMN IF NOT EXISTS learning_area_id UUID REFERENCES learning_areas(id) ON DELETE CASCADE;`);
    await pgClient.query(`ALTER TABLE cbc_student_assessments ADD COLUMN IF NOT EXISTS strand_id UUID REFERENCES cbc_strands(id) ON DELETE CASCADE;`);
    await pgClient.query(`ALTER TABLE cbc_student_assessments ADD COLUMN IF NOT EXISTS sub_strand_id UUID REFERENCES cbc_sub_strands(id) ON DELETE CASCADE;`);
    await pgClient.query(`ALTER TABLE cbc_student_assessments ADD COLUMN IF NOT EXISTS extra_strand_id UUID REFERENCES cbc_extra_strands(id) ON DELETE CASCADE;`);
    console.log('✓ Updated cbc_student_assessments with new relational columns');

    // 6. Turn on Row Level Security (RLS) if Supabase relies on it (optional, but good practice if needed later)
    // Supabase will automatically grant standard table privileges to anon/authenticated if RLS is off, but usually we enable it.
    // For now, we will leave it default so it works out of the box with the backend.

    console.log('--- CURRICULUM ENGINE MIGRATION COMPLETE ---');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pgClient.end();
  }
}

migrate();
