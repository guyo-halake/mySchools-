const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function simulateBundling() {
  const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5'; // Giakanja
  
  console.log('--- SIMULATING COMPONENT BUNDLING LOGIC ---');
  
  const { data: submissions, error } = await supabase
    .from('results_workflow')
    .select('*, subject:subjects(name), term:terms(name), stream:streams(name)')
    .eq('school_id', schoolId)
    .eq('status', 'SUBMITTED');

  if (error) {
    console.error('Fetch Error:', error);
    return;
  }

  console.log(`Fetched ${submissions.length} SUBMITTED records.`);

  const groups = {};
  submissions.forEach(s => {
    // Exact key logic from SubmissionsUpload.tsx
    const key = `${s.term_id}-${s.exam_name}-${s.stream_id}-${s.subject_id}`;
    
    if (!groups[key]) {
      groups[key] = {
        key,
        subject: s.subject?.name || 'MISSING_SUBJECT',
        term: s.term?.name || 'MISSING_TERM',
        stream: s.stream?.name || 'MISSING_STREAM',
        exam_name: s.exam_name || 'MISSING_EXAM_NAME',
        count: 0
      };
    }
    groups[key].count++;
  });

  console.log('BUNDLES CREATED:');
  console.log(JSON.stringify(Object.values(groups), null, 2));
  
  // Check for nulls in key components
  const nullChecks = submissions.map(s => ({
    term_id: s.term_id,
    exam_name: s.exam_name,
    stream_id: s.stream_id,
    subject_id: s.subject_id
  })).slice(0, 5);
  
  console.log('Sample Data Null Check (First 5):', nullChecks);
}

simulateBundling();
