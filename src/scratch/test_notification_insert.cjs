const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function testNotify() {
  const parentId = '12d2e393-0572-4085-bebb-99ce96d4955a'; // Guyo Halake (Parent)
  const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5'; // Giakanja
  
  const { data, error } = await supabase
    .from('in_app_notifications')
    .insert([{
      user_id: parentId,
      school_id: schoolId,
      title: 'Real Test Notification',
      message: 'This is a test notification from the system.',
      type: 'success',
      read: false
    }])
    .select();

  if (error) {
    console.error('Notification Insert Error:', error);
  } else {
    console.log('✅ Notification Created Successfully:', JSON.stringify(data, null, 2));
  }
}

testNotify();
