const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function manualTrigger() {
  const client = new Client({ connectionString });
  await client.connect();
  
  try {
    // 1. Reset to SUBMITTED first to ensure the trigger fires on change
    await client.query("UPDATE public.results_workflow SET status = 'SUBMITTED' WHERE id = '50e77341-60bb-4e61-b2a1-75c035e034e2'");
    
    // 2. Update to APPROVED
    console.log('Updating to APPROVED...');
    await client.query("UPDATE public.results_workflow SET status = 'APPROVED' WHERE id = '50e77341-60bb-4e61-b2a1-75c035e034e2'");
    
    // 3. Check notifications
    const res = await client.query("SELECT * FROM public.in_app_notifications");
    console.log('Notifications Count:', res.rowCount);
    console.log('Notifications:', JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

manualTrigger();
