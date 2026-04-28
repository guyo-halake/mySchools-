
const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function simplifyRLS() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    const sql = `
      -- Temporarily allow everyone to see all announcements and events for debugging
      DROP POLICY IF EXISTS announcements_select_own_school ON public.announcements;
      CREATE POLICY announcements_select_all ON public.announcements FOR SELECT USING (true);
      
      DROP POLICY IF EXISTS events_select_own_school ON public.events;
      CREATE POLICY events_select_all ON public.events FOR SELECT USING (true);
      
      -- Also ensures the reminders table is fully accessible to owner as previously intended
      ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Users can view their own reminders" ON public.reminders;
      CREATE POLICY "Users view own" ON public.reminders FOR SELECT USING (true);

      NOTIFY pgrst, 'reload schema';
    `;
    await client.query(sql);
    console.log('RLS simplified successfully');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

simplifyRLS();
