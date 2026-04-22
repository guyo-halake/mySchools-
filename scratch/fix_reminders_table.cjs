
const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function setupReminders() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to DB');

    const sql = `
      -- 1. Create reminders table
      CREATE TABLE IF NOT EXISTS public.reminders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        item_id UUID NOT NULL,
        item_type TEXT NOT NULL,
        remind_at TIMESTAMPTZ NOT NULL,
        title TEXT NOT NULL,
        school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      -- 2. Enable RLS
      ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

      -- 3. Drop existing policies if they exist to avoid errors
      DROP POLICY IF EXISTS "Users can view their own reminders" ON public.reminders;
      DROP POLICY IF EXISTS "Users can insert their own reminders" ON public.reminders;
      DROP POLICY IF EXISTS "Users can delete their own reminders" ON public.reminders;

      -- 4. Create policies
      CREATE POLICY "Users can view their own reminders" ON public.reminders 
        FOR SELECT USING (auth.uid() = user_id);
      
      CREATE POLICY "Users can insert their own reminders" ON public.reminders 
        FOR INSERT WITH CHECK (auth.uid() = user_id);
      
      CREATE POLICY "Users can delete their own reminders" ON public.reminders 
        FOR DELETE USING (auth.uid() = user_id);

      -- 5. Force schema reload
      NOTIFY pgrst, 'reload schema';
    `;

    await client.query(sql);
    console.log('SQL executed successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

setupReminders();
