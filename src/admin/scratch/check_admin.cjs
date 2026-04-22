const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

async function checkAdmin() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT p.full_name, p.email, p.role, s.name as school_name
      FROM profiles p
      JOIN schools s ON s.id = p.school_id
      WHERE s.subdomain = 'schinga-boys'
    `);
    console.log('ADMINS:', JSON.stringify(res.rows));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkAdmin();
