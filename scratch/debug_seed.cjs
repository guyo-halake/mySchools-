
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vomsaqkhtturzqfuwxsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.dDCG60Khw2o3OwksT_rQZ4F9A3vnNpHSKuQWKXet1C4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const school_id = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';

  const events = [
    {
      school_id,
      title: 'End of Term Exam',
      description: 'Major assessment period.',
      date: '2026-04-27T08:00:00Z',
      location: 'School Hall',
      theme: 'Academic'
    },
    {
      school_id,
      title: 'School Closing Day',
      description: 'Term closure and report distribution.',
      date: '2026-05-01T09:00:00Z',
      location: 'Assembly Ground',
      theme: 'School Life'
    },
    {
      school_id,
      title: 'School Opening',
      description: 'Welcome back for the next term.',
      date: '2026-06-05T07:30:00Z',
      location: 'Campus',
      theme: 'Next Term'
    }
  ];

  const res = await supabase.from('events').insert(events);
  console.log('Result:', JSON.stringify(res));

  const count = await supabase.from('events').select('id', { count: 'exact' });
  console.log('New Count:', count.count);
}

seed();
