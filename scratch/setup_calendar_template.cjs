const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupAcademicCalendarTemplate() {
  try {
    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    const currentYear = new Date().getFullYear();

    console.log('\n=== SETTING UP ACADEMIC CALENDAR TEMPLATE ===\n');

    // Define term structure for THIS YEAR (the pattern)
    // This pattern will be applied to all future years
    const templateConfig = {
      year: currentYear,
      timezone: 'Africa/Nairobi',
      periodType: 'TERMS',  // School uses TERMS (not SEMESTERS, QUARTERS)
      termCount: 3,         // School has 3 terms per academic year
      terms: [
        {
          termNumber: 1,
          name: `Term 1 ${currentYear}`,
          startDate: `${currentYear}-01-01`,
          endDate: `${currentYear}-04-30`,
          midTermStart: `${currentYear}-02-10`,
          midTermEnd: `${currentYear}-02-14`
        },
        {
          termNumber: 2,
          name: `Term 2 ${currentYear}`,
          startDate: `${currentYear}-05-01`,
          endDate: `${currentYear}-08-30`,
          midTermStart: `${currentYear}-06-10`,
          midTermEnd: `${currentYear}-06-14`
        },
        {
          termNumber: 3,
          name: `Term 3 ${currentYear}`,
          startDate: `${currentYear}-09-01`,
          endDate: `${currentYear}-11-30`
        }
      ],
      holidays: [
        {
          id: 'holiday-mid-term-1',
          kind: 'MID_TERM',
          termNumber: 1,
          startDate: `${currentYear}-02-10`,
          endDate: `${currentYear}-02-14`,
          notes: 'Mid-term break'
        },
        {
          id: 'holiday-mid-term-2',
          kind: 'MID_TERM',
          termNumber: 2,
          startDate: `${currentYear}-06-10`,
          endDate: `${currentYear}-06-14`,
          notes: 'Mid-term break'
        }
      ],
      events: []
    };

    console.log('Creating ACADEMIC_CALENDAR_SETUP template...');
    console.log(`Template Year (Pattern): ${currentYear}`);
    console.log(`Period Type: ${templateConfig.periodType}`);
    console.log(`Term Count: ${templateConfig.termCount}\n`);

    const { data, error } = await supabase
      .from('templates')
      .upsert(
        {
          school_id: schoolId,
          key: 'ACADEMIC_CALENDAR_SETUP',
          name: 'Academic Calendar Setup',
          category: 'ACADEMIC',
          config: templateConfig,
          active: true,
          updated_by: null
        },
        {
          onConflict: 'school_id,key'
        }
      )
      .select('id, key, name');

    if (error) {
      console.error('❌ Failed to create template:', error.message);
      process.exit(1);
    }

    console.log(`✅ Template created/updated: ${data[0].key}\n`);

    // Now run the dynamic generation
    console.log('Running dynamic term generation...\n');
    const { execSync } = require('child_process');
    try {
      execSync('node scratch/generate_dynamic_terms.cjs', { stdio: 'inherit', cwd: process.cwd() });
    } catch (e) {
      console.error('Failed during term generation:', e.message);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

setupAcademicCalendarTemplate();
