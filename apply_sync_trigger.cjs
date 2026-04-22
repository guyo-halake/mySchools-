const { execSync } = require('child_process');

try {
  execSync('psql "postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" -f sync_results_workflow_to_exam_results.sql', { stdio: 'inherit' });
  console.log('Trigger and backfill applied successfully.');
} catch (e) {
  console.error('Error applying trigger/backfill:', e);
}
