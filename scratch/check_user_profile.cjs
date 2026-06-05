const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  
  // Find auth user ID for principal.rachi@giakanja.co.ke
  const userRes = await client.query("SELECT id, email FROM auth.users WHERE email = 'principal.rachi@giakanja.co.ke'");
  console.log('Auth User:', userRes.rows);
  
  if (userRes.rows.length > 0) {
    const userId = userRes.rows[0].id;
    // Find profile
    const profileRes = await client.query("SELECT id, full_name, role, school_id FROM public.profiles WHERE id = $1", [userId]);
    console.log('Profile:', profileRes.rows);
  }
  
  await client.end();
}

main().catch(console.error);
