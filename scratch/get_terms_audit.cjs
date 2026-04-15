// Quick script to fetch all terms and audit info
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    // Fetch all terms ordered by school_id and start_date
    const { data: terms, error: termsError } = await supabase
      .from('terms')
      .select('*')
      .order('school_id', { ascending: true })
      .order('start_date', { ascending: true });

    if (termsError) throw termsError;

    console.log('\n=== ALL TERMS IN DATABASE ===\n');
    console.log(`Total terms: ${terms.length}\n`);

    // Group by school
    const bySchool = {};
    terms.forEach(term => {
      if (!bySchool[term.school_id]) bySchool[term.school_id] = [];
      bySchool[term.school_id].push(term);
    });

    for (const [schoolId, schoolTerms] of Object.entries(bySchool)) {
      console.log(`\n━━━ SCHOOL: ${schoolId} ━━━`);
      schoolTerms.forEach((term, idx) => {
        const start = new Date(term.start_date).toLocaleDateString('en-GB');
        const end = new Date(term.end_date).toLocaleDateString('en-GB');
        const duration = Math.ceil((new Date(term.end_date) - new Date(term.start_date)) / (1000 * 60 * 60 * 24));
        const durationMonths = Math.round(duration / 30);
        
        console.log(`\n  ${idx + 1}. ${term.name}`);
        console.log(`     ID: ${term.id}`);
        console.log(`     Year: ${term.year || 'N/A'}`);
        console.log(`     Start: ${start}`);
        console.log(`     End: ${end}`);
        console.log(`     Duration: ${duration} days (~${durationMonths} months)`);
        console.log(`     Created: ${term.created_at ? new Date(term.created_at).toLocaleString('en-GB') : 'N/A'}`);
        console.log(`     Updated: ${term.updated_at ? new Date(term.updated_at).toLocaleString('en-GB') : 'N/A'}`);
      });
    }

    // Try to get audit logs if they exist
    console.log('\n\n=== AUDIT LOGS (if available) ===\n');
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .like('table_name', '%term%')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!auditError && auditLogs && auditLogs.length > 0) {
      auditLogs.forEach(log => {
        console.log(`\n${new Date(log.created_at).toLocaleString('en-GB')} - ${log.operation}`);
        console.log(`  Table: ${log.table_name}`);
        console.log(`  User: ${log.user_id || 'System'}`);
        console.log(`  Record ID: ${log.record_id}`);
      });
    } else {
      console.log('(No audit logs found or table does not exist)');
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
