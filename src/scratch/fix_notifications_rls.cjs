const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function applyFix() {
  const client = new Client({ connectionString });

  try {
    console.log('Connecting to Supabase Database...');
    await client.connect();
    console.log('Connected!');

    const sql = `
      -- Ensure RLS is active
      ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

      -- Drop existing restrictive policies if they exist
      DROP POLICY IF EXISTS "Allow teachers to send notifications" ON public.in_app_notifications;
      DROP POLICY IF EXISTS "Users can see own notifications" ON public.in_app_notifications;
      DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.in_app_notifications;
      DROP POLICY IF EXISTS "Enable select for users based on user_id" ON public.in_app_notifications;

      -- New Policy: Allow any authenticated user (Teacher) to send a notification
      -- (This allows the teacher to insert a row where user_id is the parent's ID)
      CREATE POLICY "Allow teachers to send notifications"
      ON public.in_app_notifications
      FOR INSERT
      TO authenticated
      WITH CHECK (true);

      -- New Policy: Allow users (Parents/Students) to read only their own notifications
      CREATE POLICY "Users can see own notifications"
      ON public.in_app_notifications
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
      
      -- Also allow the sender to see notifications they sent? (Optional but good for history)
      -- For now, let's keep it simple as per request.
    `;

    console.log('Applying RLS policies for Notifications...');
    await client.query(sql);
    console.log('✅ Success! Teachers can now send notifications to parents.');

  } catch (err) {
    console.error('❌ Error applying fix:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyFix();
