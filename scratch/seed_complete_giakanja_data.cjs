const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const client = new Client({ connectionString });

const GIAKANJA_ID = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';

const RATINGS = ['EE', 'ME', 'AE', 'BE'];
const RATING_WEIGHTS = [0.35, 0.45, 0.15, 0.05]; // EE: 35%, ME: 45%, AE: 15%, BE: 5%

const COMMENTS = [
  'Excellent understanding and participation.',
  'Meets the learning expectations.',
  'Shows positive attitude and steady growth.',
  'Making good progress, keep it up.',
  'Needs more practice on basic concepts.',
  'Requires guidance to complete tasks.'
];

const BANKS = ['Equity Bank', 'KCB Bank', 'Co-operative Bank', 'Family Bank'];
const METHODS = ['Bank Deposit', 'M-Pesa', 'Cheque', 'Cash'];

function getRandomRating() {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < RATING_WEIGHTS.length; i++) {
    cumulative += RATING_WEIGHTS[i];
    if (r <= cumulative) return RATINGS[i];
  }
  return 'ME';
}

function getRandomComment() {
  return COMMENTS[Math.floor(Math.random() * COMMENTS.length)];
}

async function seedCompleteData() {
  try {
    await client.connect();
    console.log('Connected to PG Database...');

    // 1. Resolve Active Term
    const termRes = await client.query(
      "SELECT id, name FROM terms WHERE school_id = $1 AND is_current = true LIMIT 1",
      [GIAKANJA_ID]
    );
    let termId;
    if (termRes.rows.length > 0) {
      termId = termRes.rows[0].id;
      console.log(`Resolved Active Term: ${termRes.rows[0].name} (${termId})`);
    } else {
      // Fallback: get latest term
      const latestTermRes = await client.query(
        "SELECT id, name FROM terms WHERE school_id = $1 ORDER BY year DESC, start_date DESC LIMIT 1",
        [GIAKANJA_ID]
      );
      if (latestTermRes.rows.length === 0) {
        throw new Error('No terms found in database! Please seed terms first.');
      }
      termId = latestTermRes.rows[0].id;
      console.log(`Resolved Fallback Latest Term: ${latestTermRes.rows[0].name} (${termId})`);
    }

    // 2. ALTER FEES TABLE
    console.log('Altering fees table if necessary...');
    await client.query("ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS payment_method TEXT;");
    await client.query("ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS due_date DATE;");
    console.log('✓ Fees table altered successfully.');

    // 3. WIPE OLD DATA
    console.log('Wiping existing data for Giakanja to prevent constraints and duplicate issues...');
    await client.query("DELETE FROM cbc_student_assessments WHERE school_id = $1", [GIAKANJA_ID]);
    await client.query("DELETE FROM cbc_project_submissions WHERE student_id IN (SELECT id FROM students WHERE school_id = $1)", [GIAKANJA_ID]);
    await client.query("DELETE FROM cbc_projects WHERE school_id = $1", [GIAKANJA_ID]);
    await client.query("DELETE FROM fees WHERE school_id = $1", [GIAKANJA_ID]);
    console.log('✓ Old data cleared successfully.');

    // 3b. ENSURE AUTH USERS FOR KEY PROFILES EXIST
    console.log('Ensuring principal account exists in auth.users schema...');
    await client.query(`
      INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role,
        created_at,
        updated_at
      ) VALUES (
        '3424216c-cb84-4e10-a2e1-f28088ded3e6',
        '00000000-0000-0000-0000-000000000000',
        'principal.rachi@giakanja.co.ke',
        crypt('password123', gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        '{}'::jsonb,
        'authenticated',
        'authenticated',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email,
        encrypted_password = EXCLUDED.encrypted_password,
        updated_at = NOW();
    `);
    console.log('✓ Principal account synced to auth.users.');

    // 4. FETCH CURRICULUM DEFINITIONS
    console.log('Fetching active learning areas, strands, and sub-strands...');
    const laRes = await client.query("SELECT id, name, category FROM learning_areas WHERE school_id = $1 AND active = true", [GIAKANJA_ID]);
    const strandRes = await client.query("SELECT id, learning_area_id, name FROM cbc_strands");
    const subStrandRes = await client.query("SELECT id, strand_id, name FROM cbc_sub_strands");

    const learningAreas = laRes.rows;
    const strands = strandRes.rows;
    const subStrands = subStrandRes.rows;

    console.log(`Loaded ${learningAreas.length} Learning Areas, ${strands.length} Strands, and ${subStrands.length} Sub-strands.`);

    // Map strands to learning areas, and sub-strands to strands
    const strandMap = {}; // learning_area_id -> list of strands
    strands.forEach(st => {
      if (!strandMap[st.learning_area_id]) strandMap[st.learning_area_id] = [];
      strandMap[st.learning_area_id].push(st);
    });

    const subStrandMap = {}; // strand_id -> list of sub-strands
    subStrands.forEach(ss => {
      if (!subStrandMap[ss.strand_id]) subStrandMap[ss.strand_id] = [];
      subStrandMap[ss.strand_id].push(ss);
    });

    // 5. FETCH ALL STUDENTS
    const studentsRes = await client.query(`
      SELECT s.id, c.name as class_name, c.level, c.category 
      FROM students s
      JOIN streams st ON s.stream_id = st.id
      JOIN classes c ON st.class_id = c.id
      WHERE s.school_id = $1
    `, [GIAKANJA_ID]);
    const students = studentsRes.rows;
    console.log(`Found ${students.length} students enrolled in the school.`);

    // 6. SEED FORMATIVE ASSESSMENTS (100% COVERAGE)
    console.log('Seeding formative assessments for each student...');
    let assessmentCount = 0;
    const assessmentParams = [];
    const assessmentRows = [];

    for (const student of students) {
      const matchingAreas = learningAreas.filter(la => la.category === student.category);

      for (const area of matchingAreas) {
        const areaStrands = strandMap[area.id] || [];
        
        for (const strand of areaStrands) {
          const strandSubs = subStrandMap[strand.id] || [];
          
          for (const sub of strandSubs) {
            const rating = getRandomRating();
            const comment = getRandomComment();

            assessmentParams.push(
              crypto.randomUUID(),
              GIAKANJA_ID,
              student.id,
              area.id,
              strand.id,
              sub.id,
              strand.name,
              sub.name,
              rating,
              comment,
              student.level
            );
            assessmentRows.push(true); // just a counter placeholder
            assessmentCount++;
          }
        }
      }
    }

    console.log(`Generated ${assessmentCount} assessment records. Batching inserts in chunks of 500...`);
    
    await client.query('BEGIN');
    const chunkSize = 500;
    for (let i = 0; i < assessmentCount; i += chunkSize) {
      const currentChunkSize = Math.min(chunkSize, assessmentCount - i);
      const chunkParams = assessmentParams.slice(i * 11, (i + currentChunkSize) * 11);
      
      const valuesPlaceholders = [];
      for (let j = 0; j < currentChunkSize; j++) {
        const base = j * 11;
        valuesPlaceholders.push(`($${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6}, $${base+7}, $${base+8}, $${base+9}, $${base+10}, $${base+11}, NOW(), NOW())`);
      }

      const queryText = `
        INSERT INTO cbc_student_assessments (
          id, school_id, student_id, learning_area_id, strand_id, sub_strand_id,
          strand, sub_strand, rating, teacher_comment, grade_level_at_time,
          created_at, updated_at
        ) VALUES ${valuesPlaceholders.join(', ')}
      `;
      await client.query(queryText, chunkParams);
    }
    await client.query('COMMIT');
    console.log(`✓ Successfully seeded ${assessmentCount} CBC assessments (100% curriculum coverage).`);

    // 7. SEED FEES LEDGER (332 STUDENTS)
    console.log('Seeding fee ledgers for all students...');
    let feeCount = 0;
    const feeParams = [];

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const amountDue = 45000;
      
      // Determine status distribution: 35% PAID, 40% PARTIAL, 25% UNPAID
      const pct = i / students.length;
      let status, amountPaid, payDate, method, bank, ref;
      
      if (pct < 0.35) {
        status = 'PAID';
        amountPaid = 45000;
        payDate = '2026-02-10';
        method = 'Bank Deposit';
        bank = BANKS[i % BANKS.length];
        ref = `REF-DEP-${202600 + i}`;
      } else if (pct < 0.75) {
        status = 'PARTIAL';
        // Random partial payment
        const choices = [15000, 20000, 25000, 30000];
        amountPaid = choices[i % choices.length];
        payDate = '2026-02-18';
        method = 'M-Pesa';
        bank = 'M-Pesa';
        ref = `REF-MPESA-${Math.floor(100000 + Math.random() * 900000)}`;
      } else {
        status = 'UNPAID';
        amountPaid = 0;
        payDate = null;
        method = null;
        bank = null;
        ref = null;
      }

      feeParams.push(
        crypto.randomUUID(),
        GIAKANJA_ID,
        student.id,
        termId,
        'Tuition Fee',
        amountDue,
        amountPaid,
        status,
        bank,
        ref,
        method,
        payDate,
        '2026-02-15'
      );
      feeCount++;
    }

    await client.query('BEGIN');
    const feeChunkSize = 100;
    for (let i = 0; i < feeCount; i += feeChunkSize) {
      const currentChunkSize = Math.min(feeChunkSize, feeCount - i);
      const chunkParams = feeParams.slice(i * 13, (i + currentChunkSize) * 13);
      
      const valuesPlaceholders = [];
      for (let j = 0; j < currentChunkSize; j++) {
        const base = j * 13;
        valuesPlaceholders.push(`($${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6}, $${base+7}, $${base+8}, $${base+9}, $${base+10}, $${base+11}, $${base+12}, $${base+13}, NOW(), NOW())`);
      }

      const queryText = `
        INSERT INTO fees (
          id, school_id, student_id, term_id, type, amount_due, amount_paid, 
          status, bank_name, reference_no, payment_method, payment_date, due_date, 
          created_at, updated_at
        ) VALUES ${valuesPlaceholders.join(', ')}
      `;
      await client.query(queryText, chunkParams);
    }
    await client.query('COMMIT');
    console.log(`✓ Successfully seeded ${feeCount} fee records with full payment audit fields.`);

    // 8. SEED SUMMATIVE PROJECTS (SBA) AND SUBMISSIONS
    console.log('Seeding Summative Projects & student submissions...');
    
    // Create projects
    const projects = [
      {
        id: crypto.randomUUID(),
        category: 'Upper Primary',
        title: 'Kitchen Garden Setup (Agriculture)',
        description: 'Design and build an organic kitchen garden using recycleable containers.',
        deadline: '2026-03-30'
      },
      {
        id: crypto.randomUUID(),
        category: 'Upper Primary',
        title: 'Recycled collage Composition (Creative Arts)',
        description: 'Construct a visual collage using waste materials to show environmental care.',
        deadline: '2026-04-05'
      },
      {
        id: crypto.randomUUID(),
        category: 'Junior High School',
        title: 'Workshop Tool Demonstration (Pre-Technical)',
        description: 'Demonstrate the safe storage, handling and handling safety rules for workshop tools.',
        deadline: '2026-03-25'
      },
      {
        id: crypto.randomUUID(),
        category: 'Junior High School',
        title: 'Scientific Apparatus Illustration (Integrated Science)',
        description: 'Design a catalog illustration demonstrating the usage of lab burner, test tubes, and stands.',
        deadline: '2026-04-10'
      }
    ];

    let projectCount = 0;
    let submissionCount = 0;

    await client.query('BEGIN');
    for (const proj of projects) {
      const keyword = proj.title.includes('Agriculture') ? 'Agriculture' : 
                      proj.title.includes('Creative') ? 'Creative' :
                      proj.title.includes('Pre-Technical') ? 'Pre-Technical' : 'Integrated Science';

      const laMatch = learningAreas.find(la => la.name.includes(keyword) && la.category === proj.category);
      if (!laMatch) {
        console.log(`Warning: Learning area not found for project ${proj.title}. Skipping.`);
        continue;
      }

      await client.query(`
        INSERT INTO cbc_projects (id, school_id, term_id, learning_area_id, title, description, deadline, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [proj.id, GIAKANJA_ID, termId, laMatch.id, proj.title, proj.description, proj.deadline]);
      projectCount++;
    }
    await client.query('COMMIT');

    // Generate project submissions params
    const submissionParams = [];
    for (const proj of projects) {
      const keyword = proj.title.includes('Agriculture') ? 'Agriculture' : 
                      proj.title.includes('Creative') ? 'Creative' :
                      proj.title.includes('Pre-Technical') ? 'Pre-Technical' : 'Integrated Science';

      const laMatch = learningAreas.find(la => la.name.includes(keyword) && la.category === proj.category);
      if (!laMatch) continue;

      const targetStudents = students.filter(s => s.category === proj.category);
      for (const student of targetStudents) {
        const rating = getRandomRating();
        const score = rating === 'EE' ? Math.floor(85 + Math.random() * 15) :
                      rating === 'ME' ? Math.floor(70 + Math.random() * 15) :
                      rating === 'AE' ? Math.floor(50 + Math.random() * 20) :
                      Math.floor(30 + Math.random() * 20);

        submissionParams.push(
          crypto.randomUUID(),
          proj.id,
          student.id,
          rating,
          `Score: ${score}%. Good effort shown in this practical assignment.`,
          `https://evidence.giakanja.co.ke/uploads/${student.id}.jpg`
        );
        submissionCount++;
      }
    }

    await client.query('BEGIN');
    const subChunkSize = 100;
    for (let i = 0; i < submissionCount; i += subChunkSize) {
      const currentChunkSize = Math.min(subChunkSize, submissionCount - i);
      const chunkParams = submissionParams.slice(i * 6, (i + currentChunkSize) * 6);
      
      const valuesPlaceholders = [];
      for (let j = 0; j < currentChunkSize; j++) {
        const base = j * 6;
        valuesPlaceholders.push(`($${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6}, NOW(), NOW())`);
      }

      const queryText = `
        INSERT INTO cbc_project_submissions (
          id, project_id, student_id, rubric_rating, teacher_comment, evidence_url, created_at, updated_at
        ) VALUES ${valuesPlaceholders.join(', ')}
      `;
      await client.query(queryText, chunkParams);
    }
    await client.query('COMMIT');
    console.log(`✓ Seeded ${projectCount} Projects and ${submissionCount} Project submissions successfully.`);

    console.log('\n====================================');
    console.log(' DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log(`- CBC Formative Assessments: ${assessmentCount}`);
    console.log(`- Fees Invoices: ${feeCount}`);
    console.log(`- Summative Projects: ${projectCount}`);
    console.log(`- Project Submissions: ${submissionCount}`);
    console.log('====================================');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('DATABASE SEEDING FAILED:', err.message);
  } finally {
    await client.end();
  }
}

seedCompleteData();
