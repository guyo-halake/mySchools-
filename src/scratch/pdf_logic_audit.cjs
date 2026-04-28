const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function auditPDFLogic() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    // 1. Get the student "Razanyoo"
    const sRes = await client.query(`
      SELECT s.*, c.name as class_name, c.level as class_level, str.name as stream_name
      FROM students s
      JOIN streams str ON s.stream_id = str.id
      JOIN classes c ON str.class_id = c.id
      WHERE s.id = '037c8a46-f82f-40df-99ba-5e41904612d2'
    `);
    const student = sRes.rows[0];
    console.log('STUDENT CONTEXT:', {
      name: 'Razanyoo',
      class: student.class_name,
      level: student.class_level,
      stream: student.stream_name
    });

    // 2. Get results
    const rRes = await client.query(`
      SELECT r.*, t.year, t.name as term_name, e.name as exam_name
      FROM exam_results r
      JOIN exams e ON r.exam_id = e.id
      JOIN terms t ON e.term_id = t.id
      WHERE r.student_id = $1
    `, [student.id]);
    
    const results = rRes.rows.map(r => ({
      ...r,
      exam: { name: r.exam_name, term: { year: r.year, name: r.term_name } }
    }));

    console.log('TOTAL RESULTS FOUND:', results.length);

    // 3. Simulate pdf.ts logic (Lines 63-76)
    const mode = 1; // Form 1
    const currentFormLevel = parseInt(student.class_level || student.class_name.slice(-1) || '4');
    const latestResultYear = results.length > 0
      ? Math.max(...results.map((r) => r.exam.term.year || 0))
      : 2026;

    console.log('PDF SIMULATION PARAMS:', {
      mode,
      currentFormLevel,
      latestResultYear
    });

    const formNum = mode;
    const targetYear = latestResultYear - (currentFormLevel - formNum);
    console.log('TARGET YEAR CALCULATED:', targetYear);

    const resultsForYear = results.filter((r) => {
      const rYear = r.exam.term.year;
      const rTermName = (r.exam.term.name || '').toUpperCase();
      const rExamName = (r.exam.name || '').toUpperCase();
      const match = rYear === targetYear || rTermName.includes(`FORM ${formNum}`) || rExamName.includes(`FORM ${formNum}`);
      return match;
    });

    console.log('RESULTS FILTERED FOR PDF:', resultsForYear.length);
    if (resultsForYear.length > 0) {
      console.log('SAMPLE MATCH:', {
        marks: resultsForYear[0].marks,
        exam: resultsForYear[0].exam.name,
        term: resultsForYear[0].exam.term.name,
        year: resultsForYear[0].exam.term.year
      });
    } else {
      console.log('CRITICAL: NO RESULTS MATCHED FOR THE PDF!');
    }

  } finally {
    await client.end();
  }
}

auditPDFLogic();
