
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkColumns() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching event:', error);
  } else {
    console.log('Event columns:', Object.keys(data[0] || {}));
  }
}

checkColumns();
