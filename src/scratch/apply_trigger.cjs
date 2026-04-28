const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function applyNotificationTrigger() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('🚀 Applying In-App Notification Trigger...');

    // 1. Create the function
    await client.query(`
      CREATE OR REPLACE FUNCTION notify_parent_on_result_publish()
      RETURNS TRIGGER AS $$
      DECLARE
        v_parent_id UUID;
        v_student_name TEXT;
        v_exam_name TEXT;
        v_term_name TEXT;
      BEGIN
        -- 1. Get Parent ID and Student Name
        SELECT parent_id, p.full_name INTO v_parent_id, v_student_name
        FROM students s
        JOIN profiles p ON s.id = p.id
        WHERE s.id = NEW.student_id;

        -- 2. Get Exam and Term Name
        SELECT e.name, t.name INTO v_exam_name, v_term_name
        FROM exams e
        JOIN terms t ON e.term_id = t.id
        WHERE e.id = NEW.exam_id;

        -- 3. Insert Notification for Parent
        IF v_parent_id IS NOT NULL THEN
          INSERT INTO in_app_notifications (
            user_id,
            school_id,
            title,
            message,
            type,
            link,
            is_read,
            created_at
          ) VALUES (
            v_parent_id,
            NEW.school_id,
            'New Exam Results Published',
            'Hello! The ' || COALESCE(v_exam_name, 'Academic') || ' results for ' || v_student_name || ' in ' || COALESCE(v_term_name, 'the current term') || ' have been published. Click here to view the report.',
            'success',
            '/parent/results',
            false,
            NOW()
          );
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 2. Create the trigger
    await client.query(`
      DROP TRIGGER IF EXISTS trg_notify_parent_on_result_publish ON exam_results;
      CREATE TRIGGER trg_notify_parent_on_result_publish
      AFTER INSERT ON exam_results
      FOR EACH ROW
      EXECUTE FUNCTION notify_parent_on_result_publish();
    `);

    console.log('✅ Trigger applied successfully!');
  } catch (err) {
    console.error('❌ Error applying trigger:', err);
  } finally {
    await client.end();
  }
}

applyNotificationTrigger();
