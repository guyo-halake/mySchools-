
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkColumns() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching announcement:', error);
  } else {
    console.log('Announcement columns:', Object.keys(data[0] || {}));
  }
}

checkColumns();
