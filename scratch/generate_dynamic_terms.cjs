const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * This script generates terms dynamically based on school configuration.
 * It does NOT hardcode years - instead it generates terms for:
 * - Current year
 * - N years into the future
 * 
 * The term STRUCTURE (names, dates) is defined once and reused for all years.
 */

async function generateSchoolTerms() {
  try {
    const schoolId = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5';
    const currentYear = new Date().getFullYear();
    const yearsToGenerate = 5; // Generate current year + 5 future years

    console.log('\n=== DYNAMIC TERM GENERATION ===\n');
    console.log(`School ID: ${schoolId}`);
    console.log(`Current Year: ${currentYear}`);
    console.log(`Generating terms for: ${currentYear} - ${currentYear + yearsToGenerate}\n`);

    // STEP 1: Get the academic calendar template to get the term pattern
    console.log('📋 Reading ACADEMIC_CALENDAR_SETUP template...');
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('config')
      .eq('school_id', schoolId)
      .eq('key', 'ACADEMIC_CALENDAR_SETUP')
      .single();

    if (templateError || !template) {
      console.error('❌ Academic calendar template not found. Create one first.');
      return;
    }

    const config = template.config || {};
    const termStructure = config.terms || [];
    const periodType = config.periodType || 'TERMS';

    if (termStructure.length === 0) {
      console.error('❌ No term structure defined in template.');
      console.log('   Define term dates in ACADEMIC_CALENDAR_SETUP template first.');
      return;
    }

    console.log(`✅ Found term structure: ${periodType} with ${termStructure.length} periods\n`);

    // STEP 2: Extract the DATE PATTERN from one year (the template year)
    // e.g., if Term 1 2026 is Jan 1 - Apr 30, then Term 1 for ANY year is Jan 1 - Apr 30
    const templateYear = config.year || currentYear;
    const datePattern = termStructure.map((term) => {
      // Parse the dates from the template to extract day/month
      const startDate = new Date(term.startDate);
      const endDate = new Date(term.endDate);

      return {
        termNumber: term.termNumber,
        name: String(term.name || `Term ${term.termNumber}`).replace(/\d{4}/, 'YYYY'), // Remove year from name
        startMonth: startDate.getMonth() + 1, // 1-12
        startDay: startDate.getDate(),        // 1-31
        endMonth: endDate.getMonth() + 1,     // 1-12
        endDay: endDate.getDate()             // 1-31
      };
    });

    console.log('📅 Extracted date pattern:');
    datePattern.forEach((p) => {
      console.log(
        `   ${p.name}: ${String(p.startMonth).padStart(2, '0')}/${String(p.startDay).padStart(2, '0')} - ${String(p.endMonth).padStart(2, '0')}/${String(p.endDay).padStart(2, '0')}`
      );
    });
    console.log();

    // STEP 3: Generate terms for all years using the pattern
    console.log(`🔄 Generating terms for ${yearsToGenerate + 1} years...\n`);

    let totalGenerated = 0;
    const generatedTerms = [];

    for (let yearOffset = 0; yearOffset <= yearsToGenerate; yearOffset++) {
      const year = currentYear + yearOffset;

      for (const pattern of datePattern) {
        // Apply the date pattern to this year
        const startDate = new Date(year, pattern.startMonth - 1, pattern.startDay);
        const endDate = new Date(year, pattern.endMonth - 1, pattern.endDay);

        // Format as YYYY-MM-DD
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        // Generate name: "Term 1 2026", "Semester 2 2027", etc.
        const termName = `${pattern.name.replace('YYYY', '')} ${year}`.trim();

        generatedTerms.push({
          school_id: schoolId,
          name: termName,
          year,
          start_date: startStr,
          end_date: endStr
        });

        totalGenerated++;
      }
    }

    // STEP 4: Upsert generated terms (don't delete, just add missing ones)
    console.log(`📤 Upserting ${totalGenerated} terms to database...\n`);

    for (const term of generatedTerms) {
      const { error } = await supabase
        .from('terms')
        .upsert(term, {
          onConflict: 'school_id,name,year' // Avoid duplicates
        });

      if (error && !error.message.includes('duplicate')) {
        console.error(`❌ Failed to upsert ${term.name}:`, error.message);
      } else {
        console.log(`✅ ${term.name}: ${term.start_date} → ${term.end_date}`);
      }
    }

    console.log(`\n✨ Generated ${totalGenerated} terms covering ${yearsToGenerate + 1} academic years\n`);
    console.log('Key points:');
    console.log(`  • Pattern defined in template for year ${templateYear}`);
    console.log('  • Pattern applies to all years: current + ' + yearsToGenerate + ' future');
    console.log('  • Non-destructive: only adds missing terms');
    console.log('  • Run this annually to add new year terms\n');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

generateSchoolTerms();
