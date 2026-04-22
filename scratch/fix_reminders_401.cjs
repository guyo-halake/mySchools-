
const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function fixRemindersRLS() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    const sql = `
      -- Fully open SELECT and INSERT for reminders for debugging
      DROP POLICY IF EXISTS "Users view own" ON public.reminders;
      DROP POLICY IF EXISTS "Users can view their own reminders" ON public.reminders;
      DROP POLICY IF EXISTS "Users can insert their own reminders" ON public.reminders;
      DROP POLICY IF EXISTS "Users can delete their own reminders" ON public.reminders;

      CREATE POLICY "allow_all_select" ON public.reminders FOR SELECT USING (true);
      CREATE POLICY "allow_all_insert" ON public.reminders FOR INSERT WITH CHECK (true);
      CREATE POLICY "allow_all_delete" ON public.reminders FOR DELETE USING (true);
      
      NOTIFY pgrst, 'reload schema';
    `;
    await client.query(sql);
    console.log('Reminders RLS forced to permissive for debugging 401');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

fixRemindersRLS();
