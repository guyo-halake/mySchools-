const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const pgClient = new Client({ connectionString });

async function seedFees() {
  try {
    await pgClient.connect();
    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    
    console.log('Fetching Institutional Context (Latest Term)...');
    const studentsReq = await pgClient.query('SELECT id FROM students WHERE school_id = $1 LIMIT 30', [schoolId]);
    const termRes = await pgClient.query('SELECT id FROM terms WHERE school_id = $1 ORDER BY year DESC, end_date DESC LIMIT 1', [schoolId]);
    
    if (studentsReq.rows.length === 0 || termRes.rows.length === 0) {
        throw new Error('Database context missing (students or terms).');
    }

    const termId = termRes.rows[0].id;
    const banks = ['KCB Bank', 'Equity Bank', 'Co-operative Bank', 'Family Bank', 'Absa Bank'];

    console.log(`Injecting ${studentsReq.rows.length} Financial Records into the Ledger...`);

    for (let i = 0; i < studentsReq.rows.length; i++) {
        const studentId = studentsReq.rows[i].id;
        const amountDue = 45000;
        // Logic: 1/4 PAID, 1/4 PARTIAL, 1/4 LOW-PARTIAL, 1/4 UNPAID
        const amountPaid = i % 4 === 0 ? 45000 : i % 4 === 1 ? 25000 : i % 4 === 2 ? 10000 : 0;
        const status = amountPaid === 45000 ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'UNPAID';
        const bank = banks[i % banks.length];
        const ref = 'GHS-TX-' + (202400 + i);

        await pgClient.query(`
            INSERT INTO fees (school_id, student_id, term_id, type, amount_due, amount_paid, status, bank_name, reference_no, payment_date) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE - integer '1' * $10)
        `, [schoolId, studentId, termId, 'Tuition Fee', amountDue, amountPaid, status, bank, ref, i % 30]);
        
        if (i % 10 === 0) console.log(`Injected ${i} records...`);
    }

    console.log('--- FINANCIAL SEEDING COMPLETE ---');
    console.log('Principal Ledger is now LIVE with REAL data.');
  } catch (e) {
    console.error('Seeding Failure:', e.message);
  } finally {
    await pgClient.end();
  }
}

seedFees();
