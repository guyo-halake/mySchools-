const { Client } = require('pg');
const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

async function cleanup() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const sid = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    console.log('Cleaning up school:', sid);

    // 1. Delete ALL rows for this school
    await client.query('DELETE FROM grading_systems WHERE school_id = $1', [sid]);

    // 2. Insert a single, clean A-E scale
    const scales = [
      { g: 'A', min: 80, max: 100, pts: 12, sort: 1 },
      { g: 'B', min: 65, max: 79, pts: 9, sort: 2 },
      { g: 'C', min: 50, max: 64, pts: 6, sort: 3 },
      { g: 'D', min: 35, max: 49, pts: 3, sort: 4 },
      { g: 'E', min: 0, max: 34, pts: 1, sort: 5 }
    ];

    for (const s of scales) {
      await client.query(`
        INSERT INTO grading_systems 
        (school_id, grade, min_mark, max_mark, grade_point, sort_order, level, applies_to_class_from, applies_to_class_to) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, 
        [sid, s.g, s.min, s.max, s.pts, s.sort, 'SECONDARY', 1, 4]
      );
    }

    console.log('CLEAN SWEEP SUCCESSFUL. Scale reset to A-E.');
  } finally {
    await client.end();
  }
}

cleanup();
