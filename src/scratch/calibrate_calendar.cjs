const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function migrateCalendar() {
  try {
    await pgClient.connect();
    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    
    console.log('--- CALENDAR MIGRATION STARTED ---');

    // 1. Correct the dates for the Clean 2026 Terms
    console.log('Updating term dates...');
    await pgClient.query("UPDATE terms SET start_date = '2026-01-02', end_date = '2026-03-19' WHERE id = 'bfcf555c-4f85-48ad-989c-f25b838b247f'");
    await pgClient.query("UPDATE terms SET start_date = '2026-05-02', end_date = '2026-07-10' WHERE id = '01bf076e-1b0d-49d7-a9cc-c9d00a0c744d'");
    await pgClient.query("UPDATE terms SET start_date = '2026-08-04', end_date = '2026-10-23' WHERE id = '0235dca4-653c-4d95-b167-8d284a5f41fe'");

    // 2. Re-link the 498 fees from 'Term 1 2025' to the correct 'Term 1 2026'
    console.log('Re-linking 498 fee records to correct Term 1...');
    await pgClient.query("UPDATE fees SET term_id = 'bfcf555c-4f85-48ad-989c-f25b838b247f' WHERE term_id = '1381ea42-993a-4cc8-bb31-da42a8b9e9d0' AND school_id = $1", [schoolId]);

    // 3. Set Term 2 as the NEXT active term since we are in April
    // actually, let's keep Term 1 as 'current' for now so they see those collections, 
    // but the system will know Term 1 ended.
    await pgClient.query("UPDATE terms SET is_current = false WHERE school_id = $1", [schoolId]);
    await pgClient.query("UPDATE terms SET is_current = true WHERE id = 'bfcf555c-4f85-48ad-989c-f25b838b247f'");

    // 4. Cleanup Duplicates (Terms with duplicate names/years)
    console.log('Cleaning up duplicate terms...');
    await pgClient.query("DELETE FROM terms WHERE name LIKE '%2026%' AND name != 'Term 1 2026' AND school_id = $1", [schoolId]);
    // Also remove the Term 1 2026 duplicate since we have Term 1
    await pgClient.query("DELETE FROM terms WHERE id = 'ce2ac7be-7c87-458d-b23f-166df37596bc'");
    await pgClient.query("DELETE FROM terms WHERE id = '945dd685-1e23-4f54-9fc3-43abc8de26eb'");
    await pgClient.query("DELETE FROM terms WHERE id = 'd18f3ba3-aa65-40ad-8201-989e4a2a375a'");

    console.log('--- MIGRATION COMPLETE ---');
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    await pgClient.end();
  }
}

migrateCalendar();
