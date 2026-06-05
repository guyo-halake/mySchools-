const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('Inserting principal into auth.users...');
  const res = await client.query(`
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at
    ) VALUES (
      '3424216c-cb84-4e10-a2e1-f28088ded3e6',
      '00000000-0000-0000-0000-000000000000',
      'principal.rachi@giakanja.co.ke',
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
      email = EXCLUDED.email,
      encrypted_password = EXCLUDED.encrypted_password,
      updated_at = NOW();
  `);
  console.log('Result:', res);

  await client.end();
}

main().catch(console.error);
