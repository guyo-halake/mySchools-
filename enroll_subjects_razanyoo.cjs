const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const pgClient = new Client({ connectionString });

async function enrollRazanyoo() {
  try {
    await pgClient.connect();
    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    const studentAdm = 'GHS-8800';

    console.log('Fetching Razanyoo Master Records...');
    const studentRes = await pgClient.query('SELECT id FROM students WHERE adm_no = $1', [studentAdm]);
    if (studentRes.rows.length === 0) throw new Error('Razanyoo not found');
    const studentId = studentRes.rows[0].id;

    const subjectsToEnroll = [
        'Mathematics', 'English', 'Kiswahili', 
        'Chemistry', 'Physics', 'CRE', 
        'Business Studies', 'History', 'Government'
    ];

    console.log('Enrolling in specialization subjects...');
    for (const subName of subjectsToEnroll) {
        const subRes = await pgClient.query('SELECT id FROM subjects WHERE name = $1', [subName]);
        if (subRes.rows.length > 0) {
            await pgClient.query('INSERT INTO student_subjects (student_id, subject_id, school_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', 
                [studentId, subRes.rows[0].id, schoolId]);
            console.log('Enrolled in:', subName);
        }
    }

    console.log('--- ENROLLMENT COMPLETE ---');
  } catch (e) {
    console.error('Enrollment Failure:', e.message);
  } finally {
    await pgClient.end();
  }
}

enrollRazanyoo();
