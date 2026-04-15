const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';

    console.log('\n=== SEEDING SCHOOL-WIDE TERMS (NOT PER-FORM) ===\n');

    // Clear existing terms
    console.log('Clearing existing terms...');
    await supabase
      .from('terms')
      .delete()
      .eq('school_id', schoolId);

    // Define term structure for this school
    // You can have: 3 terms, 2 semesters, 4 quarters, etc.
    const termStructure = [
      {
        periodType: 'TERM',  // or 'SEMESTER', 'QUARTER'
        count: 3,
        year: 2024,
        terms: [
          {
            name: 'Term 1 2024',
            startDate: '2024-01-01',
            endDate: '2024-04-30',
            midTermStart: '2024-02-10',
            midTermEnd: '2024-02-14'
          },
          {
            name: 'Term 2 2024',
            startDate: '2024-05-01',
            endDate: '2024-08-30',
            midTermStart: '2024-06-10',
            midTermEnd: '2024-06-14'
          },
          {
            name: 'Term 3 2024',
            startDate: '2024-09-01',
            endDate: '2024-11-30',
            midTermStart: '2024-10-10',
            midTermEnd: '2024-10-14'
          }
        ]
      },
      {
        periodType: 'TERM',
        count: 3,
        year: 2025,
        terms: [
          {
            name: 'Term 1 2025',
            startDate: '2025-01-01',
            endDate: '2025-04-30',
            midTermStart: '2025-02-10',
            midTermEnd: '2025-02-14'
          },
          {
            name: 'Term 2 2025',
            startDate: '2025-05-01',
            endDate: '2025-08-30',
            midTermStart: '2025-06-10',
            midTermEnd: '2025-06-14'
          },
          {
            name: 'Term 3 2025',
            startDate: '2025-09-01',
            endDate: '2025-11-30',
            midTermStart: '2025-10-10',
            midTermEnd: '2025-10-14'
          }
        ]
      },
      {
        periodType: 'TERM',
        count: 3,
        year: 2026,
        terms: [
          {
            name: 'Term 1 2026',
            startDate: '2026-01-01',
            endDate: '2026-04-30',
            midTermStart: '2026-02-10',
            midTermEnd: '2026-02-14'
          },
          {
            name: 'Term 2 2026',
            startDate: '2026-05-01',
            endDate: '2026-08-30',
            midTermStart: '2026-06-10',
            midTermEnd: '2026-06-14'
          },
          {
            name: 'Term 3 2026',
            startDate: '2026-09-01',
            endDate: '2026-11-30',
            midTermStart: '2026-10-10',
            midTermEnd: '2026-10-14'
          }
        ]
      }
    ];

    let totalInserted = 0;

    for (const yearConfig of termStructure) {
      for (const term of yearConfig.terms) {
        const { data, error } = await supabase
          .from('terms')
          .insert({
            school_id: schoolId,
            name: term.name,
            year: yearConfig.year,
            start_date: term.startDate,
            end_date: term.endDate
          })
          .select('id');

        if (error) {
          console.error(`❌ Failed to insert ${term.name}:`, error.message);
        } else {
          console.log(`✅ ${term.name}: ${term.startDate} → ${term.endDate}`);
          totalInserted++;
        }
      }
    }

    console.log(`\n✨ Total inserted: ${totalInserted} school-wide terms (not per-form)\n`);
    console.log('Key points:');
    console.log('  • All Forms 1-4 use the SAME term system');
    console.log('  • Names are "Term 1 2026" (not "Form 1 - Term 1")');
    console.log('  • Terms are school-wide, not form-specific');
    console.log('  • Configure term structure in ACADEMIC_CALENDAR_SETUP template\n');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
