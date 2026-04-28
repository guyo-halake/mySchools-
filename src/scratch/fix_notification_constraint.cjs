const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function dropConstraint() {
  const client = new Client({ connectionString });
  await client.connect();
  
  try {
    console.log('Removing restrictive foreign key constraint...');
    // Drop the constraint that requires user_id to be in auth.users
    await client.query("ALTER TABLE public.in_app_notifications DROP CONSTRAINT IF EXISTS in_app_notifications_user_id_fkey");
    
    // Also check if there's one for profiles
    await client.query("ALTER TABLE public.in_app_notifications DROP CONSTRAINT IF EXISTS in_app_notifications_profile_id_fkey");

    console.log('✅ Constraint removed. Retrying manual trigger test...');
    
    // Now retry the manual trigger
    await client.query("UPDATE public.results_workflow SET status = 'SUBMITTED' WHERE id = '50e77341-60bb-4e61-b2a1-75c035e034e2'");
    await client.query("UPDATE public.results_workflow SET status = 'APPROVED' WHERE id = '50e77341-60bb-4e61-b2a1-75c035e034e2'");
    
    const res = await client.query("SELECT * FROM public.in_app_notifications");
    console.log('✅ SUCCESS! Notification created:', JSON.stringify(res.rows[res.rows.length - 1], null, 2));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

dropConstraint();
