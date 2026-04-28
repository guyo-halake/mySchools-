const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function applyTrigger() {
  const client = new Client({ connectionString });

  try {
    console.log('Connecting to Database to install Auto-Notification Trigger...');
    await client.connect();
    console.log('Connected!');

    const sql = `
      -- 1. Create the function that will handle the auto-notification
      CREATE OR REPLACE FUNCTION notify_parent_on_result_approval()
      RETURNS TRIGGER AS $$
      DECLARE
          v_parent_id UUID;
          v_student_name TEXT;
      BEGIN
          -- Only trigger when status changes to APPROVED
          IF (NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED')) THEN
              
              -- Find the student's parent and name
              SELECT s.parent_id, p.full_name INTO v_parent_id, v_student_name
              FROM public.students s
              JOIN public.profiles p ON s.id = p.id
              WHERE s.id = NEW.student_id;

              -- If a parent exists, insert the notification
              IF (v_parent_id IS NOT NULL) THEN
                  INSERT INTO public.in_app_notifications (
                      user_id, 
                      school_id, 
                      title, 
                      message, 
                      type, 
                      is_read,
                      created_at
                  ) VALUES (
                      v_parent_id,
                      NEW.school_id,
                      'Result Approved',
                      'The results for ' || v_student_name || ' for ' || NEW.exam_name || ' have been approved.',
                      'success',
                      false,
                      NOW()
                  );
              END IF;
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- 2. Attach the trigger to the results_workflow table
      DROP TRIGGER IF EXISTS trigger_notify_parent_on_approval ON public.results_workflow;
      CREATE TRIGGER trigger_notify_parent_on_approval
      AFTER UPDATE ON public.results_workflow
      FOR EACH ROW
      EXECUTE FUNCTION notify_parent_on_result_approval();
      
      -- 3. Also handle initial inserts that might be already approved (rare but good for completeness)
      DROP TRIGGER IF EXISTS trigger_notify_parent_on_approval_insert ON public.results_workflow;
      CREATE TRIGGER trigger_notify_parent_on_approval_insert
      AFTER INSERT ON public.results_workflow
      FOR EACH ROW
      EXECUTE FUNCTION notify_parent_on_result_approval();
    `;

    console.log('Installing Database Trigger...');
    await client.query(sql);
    console.log('✅ Success! The Database will now handle all parent notifications automatically.');

  } catch (err) {
    console.error('❌ Error installing trigger:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyTrigger();
