const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const pgClient = new Client({ connectionString });

async function seedHistory() {
  try {
    await pgClient.connect();
    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    const studentAdm = 'GHS-8800';

    console.log('Fetching Razanyoo Master Records...');
    const studentRes = await pgClient.query('SELECT id FROM students WHERE adm_no = $1', [studentAdm]);
    if (studentRes.rows.length === 0) throw new Error('Razanyoo not found in students table');
    const studentId = studentRes.rows[0].id;

    const subjects = (await pgClient.query('SELECT id, name FROM subjects')).rows;
    const chosenSubjects = ['Mathematics', 'English', 'Kiswahili', 'Chemistry', 'Physics', 'CRE', 'Business Studies', 'History', 'Government'];

    const getGrade = (marks) => {
        if (marks >= 80) return 'A';
        if (marks >= 70) return 'B';
        if (marks >= 60) return 'C';
        if (marks >= 50) return 'D';
        return 'E';
    };

    console.log('Generating 4-Year Academic Framework...');
    let totalInjected = 0;

    for (let form = 1; form <= 4; form++) {
        const year = 2022 + form; 
        
        for (let t = 1; t <= 3; t++) {
            const termName = 'Form ' + form + ' - Term ' + t;
            const startDate = `${year}-${t === 1 ? '01' : t === 2 ? '05' : '09'}-01`;
            const endDate = `${year}-${t === 1 ? '04' : t === 2 ? '08' : '11'}-30`;

            const termRes = await pgClient.query('INSERT INTO terms (school_id, name, year, start_date, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING id', 
                [schoolId, termName, year, startDate, endDate]);
            const termId = termRes.rows[0].id;

            const midExam = await pgClient.query('INSERT INTO exams (school_id, term_id, name, type, date) VALUES ($1, $2, $3, \'MID_TERM\', $4) RETURNING id', 
                [schoolId, termId, termName + ' Mid-Term', startDate]);
            const endExam = await pgClient.query('INSERT INTO exams (school_id, term_id, name, type, date) VALUES ($1, $2, $3, \'END_TERM\', $4) RETURNING id', 
                [schoolId, termId, termName + ' End-Term', endDate]);

            const midId = midExam.rows[0].id;
            const endId = endExam.rows[0].id;

            for (const sub of subjects) {
                if (form > 1 && !chosenSubjects.includes(sub.name)) continue;

                // Mid Term
                const midMark = Math.floor(Math.random() * 30) + 60; 
                await pgClient.query('INSERT INTO exam_results (id, school_id, student_id, exam_id, subject_id, marks, grade) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)', 
                    [schoolId, studentId, midId, sub.id, midMark, getGrade(midMark)]);

                // End Term
                const endMark = Math.floor(Math.random() * 40) + 50; 
                await pgClient.query('INSERT INTO exam_results (id, school_id, student_id, exam_id, subject_id, marks, grade) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)', 
                    [schoolId, studentId, endId, sub.id, endMark, getGrade(endMark)]);
                
                totalInjected += 2;
            }
        }
    }

    console.log('--- MASS HISTORY ARCHIVED: ' + totalInjected + ' ENTRIES ---');
  } catch (e) {
    console.error('Final Seeding Failure:', e.message);
  } finally {
    await pgClient.end();
  }
}

seedHistory();
