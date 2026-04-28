const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient('https://vomsaqkhtturzqfuwxsn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8');

async function auditDatabase() {
  console.log('--- STARTING ARCHITECTURAL AUDIT ---');
  
  // 1. Get Tables & Columns
  const { data: cols, error: colError } = await supabase.rpc('debug_get_schema');
  
  // fall back if RPC doesn't exist
  if (colError) {
    console.log('RPC debug_get_schema not found, using information_schema via query... (this might fail if RLS active)');
  }

  // Check some core tables specifically
  const coreTables = ['schools', 'terms', 'classes', 'streams', 'subjects', 'exam_results', 'exam_windows', 'school_result_controls'];
  
  let report = '# DATABASE ARCHITECTURE AUDIT\n\n';
  
  for (const table of coreTables) {
    report += `## Table: ${table}\n`;
    // We can't easily get the structure via JS client easily without RPC or postgrest schema, 
    // so I will try to fetch one row and list the keys
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
          report += `Error fetching: ${error.message}\n\n`;
      } else if (data && data.length > 0) {
          report += 'Fields detected:\n';
          Object.keys(data[0]).forEach(k => report += `- ${k}\n`);
          report += '\n';
      } else {
          report += 'No data present (Empty Table)\n\n';
      }
    } catch (e) {
      report += `Exception: ${e.message}\n\n`;
    }
  }

  fs.writeFileSync('c:\\Users\\guyoh\\Desktop\\SchoolSystenm\\src\\scratch\\db_architecture_report.md', report);
  console.log('✅ AUDIT COMPLETE. See src/scratch/db_architecture_report.md');
}

auditDatabase();
