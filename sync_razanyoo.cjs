const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const pgClient = new Client({ connectionString });

async function syncRazanyoo() {
  try {
    await pgClient.connect();
    
    // The active student ID from the user's console
    const activeStudentId = '037c8a46-f82f-40df-99ba-5e41904612d2';
    const oldAdm = 'GHS-8800';

    console.log('Finding orphaned results for Razanyoo...');
    // Find the ID of the student with ADM GHS-8800 (the one we seeded)
    const oldStudentRes = await pgClient.query('SELECT id FROM students WHERE adm_no = $1', [oldAdm]);
    
    if (oldStudentRes.rows.length > 0) {
        const oldId = oldStudentRes.rows[0].id;
        console.log('Orphaned Student ID found:', oldId);
        
        // Repoint results
        const res1 = await pgClient.query('UPDATE exam_results SET student_id = $1 WHERE student_id = $2', [activeStudentId, oldId]);
        console.log('Repointed ' + res1.rowCount + ' exam results.');

        // Repoint disciplinary
        const res2 = await pgClient.query('UPDATE disciplinary_records SET student_id = $1 WHERE student_id = $2', [activeStudentId, oldId]);
        console.log('Repointed ' + res2.rowCount + ' disciplinary records.');

        // Repoint health
        const res3 = await pgClient.query('UPDATE student_health SET student_id = $1 WHERE student_id = $2', [activeStudentId, oldId]);
        console.log('Repointed ' + res3.rowCount + ' health records.');

        // Repoint activities
        const res4 = await pgClient.query('UPDATE student_activities SET student_id = $1 WHERE student_id = $2', [activeStudentId, oldId]);
        console.log('Repointed ' + res4.rowCount + ' activity records.');

        // Repoint enrollments
        const res5 = await pgClient.query('UPDATE student_subjects SET student_id = $1 WHERE student_id = $2', [activeStudentId, oldId]);
        console.log('Repointed ' + res5.rowCount + ' subject enrollments.');
    } else {
        console.log('No orphaned records found for GHS-8800.');
    }

    console.log('--- SYNC COMPLETE ---');
  } catch (e) {
    console.error('Sync Failure:', e.message);
  } finally {
    await pgClient.end();
  }
}

syncRazanyoo();
