const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';
const pgClient = new Client({ connectionString });

async function testTemplates() {
  try {
    await pgClient.connect();
    console.log('--- TESTING TEMPLATE SYSTEMS ---');

    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5'; // Giakanja School ID

    // 1. FIND THE CALENDAR TEMPLATE
    const tempRes = await pgClient.query("SELECT id FROM templates WHERE school_id = $1 AND key = 'ACADEMIC_CALENDAR_SETUP' LIMIT 1", [schoolId]);
    if (tempRes.rows.length === 0) {
      console.log('Calendar Template not found for this school.');
      return;
    }
    const templateId = tempRes.rows[0].id;

    // 2. DEFINE A TEST CONFIG
    const testConfig = {
      year: 2026,
      timezone: 'Africa/Nairobi',
      periodType: 'TERMS',
      termCount: 3,
      terms: [
        { termNumber: 1, name: 'Term 1 2026', startDate: '2026-01-05', endDate: '2026-04-10' },
        { termNumber: 2, name: 'Term 2 2026', startDate: '2026-05-04', endDate: '2026-08-07' },
        { termNumber: 3, name: 'Term 3 2026', startDate: '2026-09-01', endDate: '2026-11-20' }
      ],
      holidays: [
        { kind: 'MID_TERM', termNumber: 1, startDate: '2026-02-15', endDate: '2026-02-22', notes: 'Mid Term Break T1' }
      ],
      events: [
        { title: 'School Re-opening', startDate: '2026-01-05', endDate: '2026-01-05', eventType: 'ASSEMBLY' }
      ]
    };

    console.log('Applying Calendar Template via RPC...');
    const applyRes = await pgClient.query("SELECT apply_calendar_template($1, $2, $3, NULL) as result", [templateId, schoolId, JSON.stringify(testConfig)]);
    console.log('RPC Result:', applyRes.rows[0].result);

    // 3. VERIFY PERSISTENCE
    const termCountRes = await pgClient.query("SELECT count(*) FROM terms WHERE school_id = $1 AND year = 2026", [schoolId]);
    console.log(`Terms in DB for 2026: ${termCountRes.rows[0].count}`);

    const holidayRes = await pgClient.query("SELECT count(*) FROM term_holidays WHERE school_id = $1", [schoolId]);
    console.log(`Holidays in DB: ${holidayRes.rows[0].count}`);

    // 4. TEST TIMETABLE TEMPLATE CONSISTENCY
    const timetableRes = await pgClient.query("SELECT id, config FROM templates WHERE school_id = $1 AND key = 'TIMETABLE_CLASSES' LIMIT 1", [schoolId]);
    if (timetableRes.rows.length > 0) {
      const config = timetableRes.rows[0].config;
      console.log('Timetable Template found.');
      console.log(`Config Start Time: ${config.schoolStartTime}`);
      console.log(`Period Minutes: ${config.periodMinutes}`);
    }

    console.log('--- TEMPLATE TEST COMPLETE ---');

  } catch (e) {
    console.error('Template Test Error:', e.message);
  } finally {
    await pgClient.end();
  }
}

testTemplates();
