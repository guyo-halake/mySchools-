const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function getOnboardingFields() {
  try {
    await client.connect();
    
    const schools = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'schools'");
    const profiles = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'profiles'");
    
    console.log('SCHOOL_FIELDS:', JSON.stringify(schools.rows));
    console.log('PROFILE_FIELDS:', JSON.stringify(profiles.rows));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

getOnboardingFields();
