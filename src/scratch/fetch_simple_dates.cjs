const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://vomsaqkhtturzqfuwxsn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8');

async function fetchDates() {
  const { data: terms } = await supabase.from('terms').select('name, start_date, end_date').order('start_date', { ascending: false });
  console.log('TERMS:');
  terms.forEach(t => console.log(`${t.name}: ${t.start_date} to ${t.end_date}`));

  const { data: events } = await supabase.from('school_calendar_events').select('title, start_date, end_date').order('start_date', { ascending: false });
  console.log('\nEXAM EVENTS:');
  events.forEach(e => console.log(`${e.title}: ${e.start_date} to ${e.end_date}`));
}

fetchDates();
