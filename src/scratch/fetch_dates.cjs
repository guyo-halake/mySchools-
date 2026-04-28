const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchDates() {
  console.log('--- ACADEMIC TERMS ---');
  const { data: terms } = await supabase.from('terms').select('name, start_date, end_date, year').order('start_date', { ascending: false });
  console.table(terms);

  console.log('\n--- EXAM EVENTS ---');
  const { data: events } = await supabase.from('school_calendar_events').select('title, start_date, end_date, exam_type').order('start_date', { ascending: false });
  console.table(events);

  console.log('\n--- SYSTEM CONTROLS ---');
  const { data: controls } = await supabase.from('school_result_controls').select('*');
  console.table(controls);
}

fetchDates();
