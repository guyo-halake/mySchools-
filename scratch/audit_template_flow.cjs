const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditTemplateFlow() {
  try {
    console.log('\n' + '═'.repeat(70));
    console.log('🔍 COMPREHENSIVE TEMPLATE -> TIMETABLE AUDIT');
    console.log('═'.repeat(70));

    // ==================== STEP 1: Database Template ====================
    console.log('\n📊 STEP 1: Database Template State');
    console.log('─'.repeat(70));

    const { data: templates, error: templateErr } = await supabase
      .from('templates')
      .select('*')
      .eq('key', 'TIMETABLE_CLASSES')
      .eq('archived', false)
      .limit(1);

    if (templateErr) throw templateErr;
    if (!templates || templates.length === 0) {
      console.error('❌ No template found in database');
      process.exit(1);
    }

    const template = templates[0];
    const config = template.config || {};

    console.log('✓ Template found');
    console.log(`  ID: ${template.id}`);
    console.log(`  School ID: ${template.school_id}`);
    console.log(`  Created: ${template.created_at}`);
    console.log(`  Updated: ${template.updated_at}`);
    console.log(`  Active: ${template.active}`);
    console.log(`  Archived: ${template.archived}`);

    console.log('\n⏰ Timing Config:');
    console.log(`  schoolStartTime: ${config.schoolStartTime} ${config.schoolStartTime ? '✓' : '❌'}`);
    console.log(`  classStartTime: ${config.classStartTime} ${config.classStartTime ? '✓' : '❌'}`);
    console.log(`  classEndTime: ${config.classEndTime} ${config.classEndTime ? '✓' : '❌'}`);
    console.log(`  schoolEndTime: ${config.schoolEndTime} ${config.schoolEndTime ? '✓' : '❌'}`);
    console.log(`  periodMinutes: ${config.periodMinutes} ${config.periodMinutes ? '✓' : '❌'}`);

    console.log('\n🔔 Breaks (count: ${config.breaks?.length || 0}):');
    if (Array.isArray(config.breaks) && config.breaks.length > 0) {
      config.breaks.forEach((b, idx) => {
        console.log(`  ${idx + 1}. "${b.label}" - After period ${b.afterPeriods} for ${b.durationMinutes}m`);
      });
    } else {
      console.log('  ⚠️  NO BREAKS FOUND');
    }

    console.log('\n📝 Custom Entries (count: ${config.customEntries?.length || 0}):');
    if (Array.isArray(config.customEntries) && config.customEntries.length > 0) {
      config.customEntries.forEach((c, idx) => {
        console.log(`  ${idx + 1}. "${c.name}" [${c.type}] ${c.startTime}-${c.endTime}`);
      });
    } else {
      console.log('  ⚠️  NO CUSTOM ENTRIES FOUND');
    }

    console.log('\n⚙️ Generation Settings:');
    console.log(`  defaultClassLabel: ${config.defaultClassLabel || 'N/A'}`);
    console.log(`  roomPrefix: ${config.roomPrefix || 'N/A'}`);
    console.log(`  enforceLiveSlotAlignment: ${config.enforceLiveSlotAlignment}`);
    console.log(`  subjectSelectionLimit: ${config.subjectSelectionLimit}`);
    console.log(`  fallbackStreamCount: ${config.fallbackStreamCount}`);
    console.log(`  preferClassTeacherStreams: ${config.preferClassTeacherStreams}`);

    // ==================== STEP 2: Physical Timetable Entries ====================
    console.log('\n📚 STEP 2: Physical Timetable Entries');
    console.log('─'.repeat(70));

    const { data: physicalEntries, error: physicalErr } = await supabase
      .from('physical_timetable_entries')
      .select('*')
      .eq('school_id', template.school_id)
      .limit(100);

    if (physicalErr) throw physicalErr;
    console.log(`Total entries in DB: ${physicalEntries?.length || 0}`);

    if (physicalEntries && physicalEntries.length > 0) {
      const byTeacher = {};
      physicalEntries.forEach((entry) => {
        if (!byTeacher[entry.teacher_id]) byTeacher[entry.teacher_id] = [];
        byTeacher[entry.teacher_id].push(entry);
      });

      Object.entries(byTeacher).forEach(([teacherId, entries]) => {
        console.log(`\n  Teacher: ${teacherId}`);
        console.log(`    Count: ${entries.length} entries`);
        
        const times = entries.map((e) => `${e.start_time}-${e.end_time}`);
        const uniqueTimes = [...new Set(times)];
        console.log(`    Time slots used: ${uniqueTimes.join(', ')}`);
      });
    }

    // ==================== STEP 3: Live Timetable Entries ====================
    console.log('\n💬 STEP 3: Live Timetable Entries');
    console.log('─'.repeat(70));

    const { data: liveEntries, error: liveErr } = await supabase
      .from('live_timetable_entries')
      .select('*')
      .eq('school_id', template.school_id)
      .eq('template_key', 'TIMETABLE_CLASSES')
      .limit(10);

    if (liveErr) throw liveErr;
    console.log(`Total live entries: ${liveEntries?.length || 0}`);
    if (liveEntries && liveEntries.length > 0) {
      liveEntries.forEach((entry) => {
        console.log(`  • ${entry.topic || 'Untitled'} (${entry.template_key}) @ ${entry.start_at}`);
      });
    }

    // ==================== STEP 4: Verify Query Used in Timetable.tsx ====================
    console.log('\n🔗 STEP 4: Simulating Timetable.tsx Query');
    console.log('─'.repeat(70));

    // This simulates what Timetable.tsx does
    const { data: timetableTemplate, error: timetableErr } = await supabase
      .from('templates')
      .select('*')
      .eq('key', 'TIMETABLE_CLASSES')
      .eq('archived', false)
      .limit(1);

    if (timetableErr) throw timetableErr;
    
    if (!timetableTemplate || timetableTemplate.length === 0) {
      console.log('❌ Query returned NO TEMPLATE (Timetable.tsx would fail)');
    } else {
      const simConfig = timetableTemplate[0].config || {};
      console.log('✓ Query returned template successfully');
      console.log(`  schoolStartTime: ${simConfig.schoolStartTime}`);
      console.log(`  periodMinutes: ${simConfig.periodMinutes}`);
      console.log(`  breaks: ${simConfig.breaks?.length || 0}`);
      console.log(`  customEntries: ${simConfig.customEntries?.length || 0}`);
    }

    // ==================== STEP 5: Check RPC/Functions ====================
    console.log('\n⚙️ STEP 5: Checking RPC Functions');
    console.log('─'.repeat(70));

    try {
      const { data: rpcCheck } = await supabase.rpc('echo', { body: { test: true } });
      if (rpcCheck) {
        console.log('✓ RPC functions available');
      }
    } catch (e) {
      console.log('⚠️  RPC might not be available (not critical)');
    }

    // ==================== STEP 6: Data Type Validation ====================
    console.log('\n✅ STEP 6: Data Type Validation');
    console.log('─'.repeat(70));

    const issues = [];

    if (!config.schoolStartTime) issues.push('schoolStartTime missing');
    if (!config.classStartTime) issues.push('classStartTime missing');
    if (!config.classEndTime) issues.push('classEndTime missing');
    if (!config.schoolEndTime) issues.push('schoolEndTime missing');
    if (!config.periodMinutes) issues.push('periodMinutes missing');
    if (!Array.isArray(config.dayOrder)) issues.push('dayOrder not an array');
    if (!Array.isArray(config.breaks)) issues.push('breaks not an array');
    if (!Array.isArray(config.customEntries)) issues.push('customEntries not an array');
    if (!config.defaultClassLabel) issues.push('defaultClassLabel missing');
    if (!config.roomPrefix) issues.push('roomPrefix missing');

    if (issues.length === 0) {
      console.log('✓ All required fields present and valid types');
    } else {
      console.log('❌ DATA VALIDATION ISSUES:');
      issues.forEach((issue) => console.log(`  • ${issue}`));
    }

    // ==================== FINAL SUMMARY ====================
    console.log('\n' + '═'.repeat(70));
    console.log('📋 FINAL ASSESSMENT');
    console.log('═'.repeat(70));

    const templateValid = issues.length === 0;
    const hasTestData = Array.isArray(config.breaks) && config.breaks[0]?.label?.includes('TEST');
    const hasCustomEvents = Array.isArray(config.customEntries) && config.customEntries.length > 0;

    console.log(`\n✓ Template data in DB is VALID: ${templateValid}`);
    console.log(`✓ TEST data in DB: ${hasTestData ? 'YES' : 'NO'}`);
    console.log(`✓ Custom events in DB: ${hasCustomEvents ? 'YES (${config.customEntries.length})' : 'NO'}`);

    console.log('\n🎯 Expected in Timetable UI when loading:');
    if (hasTestData) {
      console.log(`  • School times: ${config.schoolStartTime} → ${config.schoolEndTime}`);
      console.log(`  • Class times: ${config.classStartTime} → ${config.classEndTime}`);
      console.log(`  • Periods: ${config.periodMinutes} minutes`);
      console.log(`  • Breaks: ${config.breaks.length}`);
      if (hasCustomEvents) {
        console.log(`  • Custom events: ${config.customEntries.length}`);
      }
    }

    console.log('\n' + '═'.repeat(70) + '\n');

  } catch (err) {
    console.error('\n❌ AUDIT ERROR:', err.message);
    console.error(err);
    process.exit(1);
  }
}

auditTemplateFlow();
