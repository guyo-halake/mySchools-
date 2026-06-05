const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  const res = await client.query(`SELECT id FROM public.profiles WHERE email = 'teacher1@giakanja.co.ke'`);
  if (res.rows.length === 0) {
    console.log("Teacher not found in profiles!");
    return client.end();
  }
  const teacherId = res.rows[0].id;
  
  console.log(`Inserting teacher (ID: ${teacherId}) into auth.users...`);
  await client.query(`
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
    ) VALUES (
      $1,
      '00000000-0000-0000-0000-000000000000',
      'teacher1@giakanja.co.ke',
      crypt('password123', gen_salt('bf')),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{}'::jsonb,
      'authenticated',
      'authenticated',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET 
      encrypted_password = EXCLUDED.encrypted_password,
      updated_at = NOW();
  `, [teacherId]);
  
  console.log('Teacher successfully synced to auth.users. You can now log in!');
  await client.end();
}

main().catch(console.error);
