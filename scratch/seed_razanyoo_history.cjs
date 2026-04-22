const { Client } = require('pg');
const crypto = require('crypto');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function seedHistory() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const razanId = '037c8a46-f82f-40df-99ba-5e41904612d2';
    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    
    // 1. Get Subjects
    const subRes = await client.query('SELECT s.id, s.name FROM subjects s JOIN student_subjects ss ON s.id = ss.subject_id WHERE ss.student_id = $1', [razanId]);
    const subjects = subRes.rows;
    if (subjects.length === 0) {
       console.log('No subjects enrolled? Check enrollment.');
       return;
    }

    const years = [2023, 2024];
    const termsArr = ['Term 1', 'Term 2', 'Term 3'];
    const examTypes = ['MID_TERM', 'END_TERM'];

    for (const year of years) {
      for (const tName of termsArr) {
        // Find or Create Term
        const fullTermName = `${tName} ${year}`;
        let termId;
        const termRes = await client.query('SELECT id FROM terms WHERE name = $1 AND school_id = $2', [fullTermName, schoolId]);
        if (termRes.rows.length > 0) {
          termId = termRes.rows[0].id;
        } else {
          termId = crypto.randomUUID();
          await client.query('INSERT INTO terms (id, school_id, name, year) VALUES ($1, $2, $3, $4)', [termId, schoolId, fullTermName, year]);
        }

        for (const eType of examTypes) {
          // Find or Create Exam
          const examName = eType === 'MID_TERM' ? 'Mid-term' : 'End-term';
          let examId;
          const examRes = await client.query('SELECT id FROM exams WHERE term_id = $1 AND type = $2 AND school_id = $3', [termId, eType, schoolId]);
          if (examRes.rows.length > 0) {
            examId = examRes.rows[0].id;
          } else {
            examId = crypto.randomUUID();
            await client.query('INSERT INTO exams (id, school_id, term_id, name, type) VALUES ($1, $2, $3, $4, $5)', [examId, schoolId, termId, examName, eType]);
          }

          // Add Results
          for (const sub of subjects) {
            const marks = 50 + Math.floor(Math.random() * 41); // 50 - 90
            let grade = 'B';
            if (marks >= 80) grade = 'A';
            else if (marks >= 70) grade = 'B+';
            else if (marks >= 60) grade = 'B';
            else if (marks >= 50) grade = 'C+';

            await client.query(`
              INSERT INTO exam_results (id, school_id, student_id, subject_id, exam_id, marks, grade, status)
              VALUES ($1, $2, $3, $4, $5, $6, $7, 'PUBLISHED')
              ON CONFLICT (student_id, subject_id, exam_id) DO NOTHING
            `, [crypto.randomUUID(), schoolId, razanId, sub.id, examId, marks, grade]);
          }
        }
      }
    }

    console.log('Seeded Form 1 (2023) and Form 2 (2024) results for Razanyoo.');

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

seedHistory();
