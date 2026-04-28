const https = require('https');

const STREAM_ID = 'e469e795-1d0f-47ac-a489-63c9bce6c454';
const PHYSICS_ID = '80e2bb41-036a-45fc-8b2c-14536373de9d';
const AGRIC_ID = 'c089a0fa-0b8f-4b0d-81dd-c62ed87cffb9';

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8';

async function request(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'vomsaqkhtturzqfuwxsn.supabase.co',
      port: 443,
      path,
      method: 'GET',
      headers: {
        'apikey': API_KEY,
        'Authorization': 'Bearer ' + API_KEY
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- FETCHING STUDENTS FOR FORM 4H ---');
  const allStudents = await request(`/rest/v1/students?select=id,adm_no&stream_id=eq.${STREAM_ID}&order=adm_no.asc`);
  
  const studentIds = allStudents.map(s => s.id);
  
  console.log('--- FETCHING SUBJECT ENROLLMENTS ---');
  // Use .in filter for student_ids to optimize
  const enrollments = await request(`/rest/v1/student_subjects?select=student_id,subject_id&student_id=in.(${studentIds.join(',')})`);
  
  const physicsAdms = [];
  const agricAdms = [];
  
  const enrollmentMap = new Map();
  enrollments.forEach(e => {
    if (!enrollmentMap.has(e.student_id)) enrollmentMap.set(e.student_id, new Set());
    enrollmentMap.get(e.student_id).add(e.subject_id);
  });
  
  allStudents.forEach(s => {
    const subjects = enrollmentMap.get(s.id) || new Set();
    if (subjects.has(PHYSICS_ID)) physicsAdms.push(s.adm_no);
    if (subjects.has(AGRIC_ID)) agricAdms.push(s.adm_no);
  });
  
  console.log('\n### 1. ALL STUDENTS IN FORM 4H (' + allStudents.length + ')');
  console.log(allStudents.map(s => s.adm_no).join(', '));
  
  console.log('\n### 2. PHYSICS STUDENTS (' + physicsAdms.length + ')');
  console.log(physicsAdms.join(', '));
  
  console.log('\n### 3. AGRICULTURE STUDENTS (' + agricAdms.length + ')');
  console.log(agricAdms.join(', '));
}

run().catch(console.error);
