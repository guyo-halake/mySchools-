
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vomsaqkhtturzqfuwxsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwMjE2OCwiZXhwIjoyMDkxMjc4MTY4fQ.dDCG60Khw2o3OwksT_rQZ4F9A3vnNpHSKuQWKXet1C4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const school_id = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
  const author_id = '88a4bbce-b683-4f59-9533-9708672bb8c6';

  const announcements = [
    {
      school_id,
      author_id,
      title: 'End of Term Exam Preparation',
      content: 'End of term exams starting soon, make sure all exams are set and students are ready.',
      target_roles: ['TEACHER', 'PARENT', 'STUDENT']
    },
    {
      school_id,
      author_id,
      title: 'Syllabus Completion Deadline',
      content: 'Teachers should all finish their subjects and syllabus completion reports must be submitted before the end of year exams.',
      target_roles: ['TEACHER']
    }
  ];

  const events = [
    {
      school_id,
      title: 'End of Term Exam',
      description: 'Main examination period for all levels.',
      date: '2026-04-27T08:00:00Z',
      location: 'School Examination Halls',
      theme: 'Academic'
    },
    {
      school_id,
      title: 'School Closing Day',
      description: 'End of term closure activities and report card collection.',
      date: '2026-05-01T09:00:00Z',
      location: 'Main School Grounds',
      theme: 'School Life'
    },
    {
      school_id,
      title: 'School Opening',
      description: 'Commencement of the new term.',
      date: '2026-06-05T07:30:00Z',
      location: 'Campus Wide',
      theme: 'New Term'
    }
  ];

  await supabase.from('announcements').insert(announcements);
  await supabase.from('events').insert(events);

  console.log('Seed completed successfully for Mr. Rachi.');
}

seed();
