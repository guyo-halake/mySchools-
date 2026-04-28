
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vomsaqkhtturzqfuwxsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.dDCG60Khw2o3OwksT_rQZ4F9A3vnNpHSKuQWKXet1C4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const { data: principal } = await supabase
    .from('profiles')
    .select('id, school_id')
    .eq('role', 'ADMIN')
    .limit(1)
    .single();

  if (!principal) {
    console.log('No admin found.');
    return;
  }

  console.log(`Seeding for School: ${principal.school_id} by Principal/Admin: ${principal.id}`);

  const announcements = [
    {
      school_id: principal.school_id,
      author_id: principal.id,
      title: 'Term 2 Academic Circular',
      content: 'All classes will commence term-end evaluations starting next Monday. Please ensure students have all required stationery and are present on campus by 7:30 AM.',
      target_roles: ['PARENT', 'STUDENT', 'TEACHER']
    },
    {
      school_id: principal.school_id,
      author_id: principal.id,
      title: 'Annual Academic Celebration',
      content: 'We are pleased to invite all parents to our annual academic excellence celebration on Friday, May 15th. We will be recognizing outstanding student achievements across all departments.',
      target_roles: ['PARENT']
    }
  ];

  const events = [
    {
      school_id: principal.school_id,
      title: 'School Athletics Meet',
      description: 'Our athletes will be competing at the Regional Sports Complex. Transportation for participants will leave campus at 6:45 AM.',
      date: '2026-05-10T09:00:00Z',
      location: 'Regional Sports Complex',
      theme: 'Activities'
    },
    {
      school_id: principal.school_id,
      title: 'Parent Consultation Day',
      description: 'Scheduled academic progress review meetings for Term 2. Individual slots have been allocated to each guardian.',
      date: '2026-05-20T08:00:00Z',
      location: 'School Hall',
      theme: 'Academic'
    }
  ];

  await supabase.from('announcements').insert(announcements);
  await supabase.from('events').insert(events);

  console.log('Seeding completed successfully.');
}

seed();
