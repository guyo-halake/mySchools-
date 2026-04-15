const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const templateId = process.argv[2];

if (!templateId) {
  console.error('Usage: node scratch/calendar_live_probe.cjs <templateId>');
  process.exit(1);
}

(async () => {
  const { data: template, error: templateErr } = await supabase
    .from('templates')
    .select('id,school_id,updated_at,config')
    .eq('id', templateId)
    .single();

  if (templateErr) throw templateErr;

  const year = Number(template.config?.year || new Date().getFullYear());
  const schoolId = template.school_id;

  const { data: terms, error: termsErr } = await supabase
    .from('terms')
    .select('id,name,year,start_date,end_date')
    .eq('school_id', schoolId)
    .eq('year', year)
    .order('name', { ascending: true });

  if (termsErr) throw termsErr;

  const { data: academicYear, error: academicYearErr } = await supabase
    .from('school_academic_years')
    .select('id,year,start_date,end_date,updated_at')
    .eq('school_id', schoolId)
    .eq('year', year)
    .maybeSingle();

  if (academicYearErr) throw academicYearErr;

  let dbHolidays = [];
  let dbEvents = [];

  if (academicYear?.id) {
    const { data: holidays, error: holidaysErr } = await supabase
      .from('term_holidays')
      .select('id,after_term_number,holiday_type,start_date,end_date,notes')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYear.id)
      .order('start_date', { ascending: true });

    if (holidaysErr) throw holidaysErr;

    const { data: events, error: eventsErr } = await supabase
      .from('school_calendar_events')
      .select('id,term_id,event_type,title,start_date,end_date,lock_results_workflow')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYear.id)
      .order('start_date', { ascending: true });

    if (eventsErr) throw eventsErr;

    dbHolidays = holidays || [];
    dbEvents = events || [];
  }

  const output = {
    templateId,
    schoolId,
    year,
    templateUpdatedAt: template.updated_at,
    templateTerms: template.config?.terms || [],
    templateHolidays: template.config?.holidays || [],
    templateEvents: template.config?.events || [],
    terms: terms || [],
    academicYear: academicYear || null,
    dbHolidays,
    dbEvents
  };

  console.log(JSON.stringify(output, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
