const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const templateId = process.argv[2];

const termNo = (name) => {
  const m = String(name || '').match(/term\s*(\d+)/i);
  return m ? Number(m[1]) : null;
};

(async () => {
  const { data: template, error: templateErr } = await supabase
    .from('templates')
    .select('school_id,config')
    .eq('id', templateId)
    .single();
  if (templateErr) throw templateErr;

  const year = Number(template.config?.year || new Date().getFullYear());
  const cfgTerms = Array.isArray(template.config?.terms) ? template.config.terms : [];

  const { data: dbTerms, error: dbErr } = await supabase
    .from('terms')
    .select('id,name,year,start_date,end_date')
    .eq('school_id', template.school_id)
    .eq('year', year);
  if (dbErr) throw dbErr;

  const dbByNo = new Map();
  for (const row of dbTerms || []) {
    const n = termNo(row.name);
    if (n && !dbByNo.has(n)) dbByNo.set(n, row);
  }

  const report = cfgTerms.map((t) => {
    const n = Number(t.termNumber || 0);
    const db = dbByNo.get(n) || null;
    return {
      termNumber: n,
      configName: t.name || null,
      dbName: db?.name || null,
      configStart: t.startDate || null,
      dbStart: db?.start_date || null,
      configEnd: t.endDate || null,
      dbEnd: db?.end_date || null,
      sameName: String(t.name || '') === String(db?.name || ''),
      sameStart: String(t.startDate || '') === String(db?.start_date || ''),
      sameEnd: String(t.endDate || '') === String(db?.end_date || '')
    };
  });

  const allMatch = report.every((r) => r.sameName && r.sameStart && r.sameEnd);
  console.log(JSON.stringify({ year, allMatch, report }, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
