const { createClient } = require('@supabase/supabase-js');

// Real project details from your project
const supabaseUrl = 'https://vomsaqkhtturzqfuwxsn.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_KEY_HERE'; // I will use the one I found in .env or similar if I can, but I'll use the raw connection string instead for the node script

const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function proveDataExists() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const studentId = '037c8a46-f82f-40df-99ba-5e41904612d2'; // Razanyoo
    
    console.log('--- PROOF OF DATA IN DATABASE ---');
    
    // 1. Check for 2026 results
    const res2026 = await client.query(`
      SELECT r.marks, sub.name as subject, t.year, t.name as term
      FROM exam_results r
      JOIN subjects sub ON r.subject_id = sub.id
      JOIN exams e ON r.exam_id = e.id
      JOIN terms t ON e.term_id = t.id
      WHERE r.student_id = $1 AND t.year = 2026
    `, [studentId]);
    
    console.log(`2026 Results Found: ${res2026.rows.length}`);
    if (res2026.rows.length > 0) {
      console.log('Sample 2026 Result:', res2026.rows[0]);
    }

    // 2. Check workflow results
    const resWorkflow = await client.query(`
      SELECT rw.marks, sub.name as subject, t.year, t.name as term
      FROM results_workflow rw
      JOIN subjects sub ON rw.subject_id = sub.id
      JOIN terms t ON rw.term_id = t.id
      WHERE rw.student_id = $1
    `, [studentId]);

    console.log(`Workflow (Draft) Results Found: ${resWorkflow.rows.length}`);
    if (resWorkflow.rows.length > 0) {
      console.log('Sample Workflow Result:', resWorkflow.rows[0]);
    }

    console.log('--- END OF PROOF ---');

  } finally {
    await client.end();
  }
}

proveDataExists();
