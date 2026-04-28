const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function audit() {
  try {
    await pgClient.connect();
    
    // 1. Get all schools
    const schools = await pgClient.query('SELECT id, name, subdomain FROM schools');
    console.log('--- SCHOOLS ---');
    console.table(schools.rows);

    for (const school of schools.rows) {
      console.log(`\nAUDITING SCHOOL: ${school.name} (${school.id})`);
      
      // 2. Check terms
      const terms = await pgClient.query('SELECT id, name, year, is_current FROM terms WHERE school_id = $1', [school.id]);
      console.log('Terms:');
      console.table(terms.rows);

      // 3. Check fee summary
      const fees = await pgClient.query('SELECT COUNT(*) as count, SUM(amount_due) as total_due, SUM(amount_paid) as total_paid FROM fees WHERE school_id = $1', [school.id]);
      console.log('Fee Summary:');
      console.table(fees.rows);

      // 4. Check if there are any orphaned fees (no term_id)
      const orphanedFees = await pgClient.query('SELECT COUNT(*) FROM fees WHERE school_id = $1 AND term_id IS NULL', [school.id]);
      console.log('Orphaned Fees (No Term):', orphanedFees.rows[0].count);
    }

  } catch (e) {
    console.error('Audit Error:', e.message);
  } finally {
    await pgClient.end();
  }
}

audit();
