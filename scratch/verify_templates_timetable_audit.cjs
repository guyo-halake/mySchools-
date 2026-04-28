const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

function mins(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return h * 60 + m;
}

function slotCountFromConfig(cfg) {
  const schoolStartTime = cfg?.schoolStartTime || '08:00';
  const classStartTime = cfg?.classStartTime || schoolStartTime;
  const classEndTime = cfg?.classEndTime || cfg?.schoolEndTime || '13:10';
  const periodMinutes = Number(cfg?.periodMinutes || 45);
  const breaks = Array.isArray(cfg?.breaks) ? cfg.breaks : [];

  const breakMap = new Map();
  for (const b of breaks) {
    const after = Number(b?.afterPeriods || 0);
    if (after > 0) breakMap.set(after, Number(b?.durationMinutes || 0));
  }

  let current = mins(classStartTime);
  const end = mins(classEndTime);
  let periods = 0;
  let classSlots = 0;

  while (current < end) {
    const classEnd = current + periodMinutes;
    if (classEnd > end) break;
    classSlots += 1;
    current = classEnd;
    periods += 1;
    if (breakMap.has(periods)) {
      const d = breakMap.get(periods);
      const breakEnd = current + d;
      if (breakEnd <= end) current = breakEnd;
    }
  }

  return classSlots;
}

(async () => {
  const client = new Client({ connectionString });
  await client.connect();

  const report = {
    checks: [],
    details: {}
  };

  const push = (name, pass, info) => report.checks.push({ name, pass, info });

  try {
    const qNull = await client.query(
      `select
         (select count(*) from templates where school_id is null) as templates_without_school,
         (select count(*) from template_permissions where school_id is null) as permissions_without_school`
    );
    const nullRow = qNull.rows[0];
    push(
      'School scope backfill',
      Number(nullRow.templates_without_school) === 0 && Number(nullRow.permissions_without_school) === 0,
      nullRow
    );

    const qTimetableTemplates = await client.query(
      `select school_id, key, config
       from templates
       where key = 'TIMETABLE_CLASSES' and archived = false`
    );

    const missingBySchool = [];
    const required = ['schoolStartTime', 'classStartTime', 'classEndTime', 'schoolEndTime', 'periodMinutes', 'dayOrder', 'breaks', 'customEntries'];
    for (const row of qTimetableTemplates.rows) {
      const cfg = row.config || {};
      const missing = required.filter((k) => cfg[k] === undefined || cfg[k] === null);
      if (missing.length > 0) missingBySchool.push({ school_id: row.school_id, missing });
    }
    push('Template required fields present', missingBySchool.length === 0, missingBySchool);

    const qPerm = await client.query(
      `select school_id, role, can_edit
       from template_permissions
       where template_key = 'TIMETABLE_CLASSES'
       order by school_id, role`
    );
    const badPerms = qPerm.rows.filter((r) => (r.role === 'TEACHER' && r.can_edit !== false) || ((r.role === 'ADMIN' || r.role === 'PRINCIPAL') && r.can_edit !== true));
    push('Permission policy rows', badPerms.length === 0, { totalRows: qPerm.rowCount, badRows: badPerms });

    const qRevisions = await client.query(`select count(*)::int as c from template_revisions`);
    push('Revision history enabled', Number(qRevisions.rows[0].c) > 0, qRevisions.rows[0]);

    const qTeacherRows = await client.query(
      `select t.school_id, t.config, p.teacher_id, count(p.*)::int as physical_count
       from templates t
       join physical_timetable_entries p on p.school_id = t.school_id
       where t.key = 'TIMETABLE_CLASSES' and t.archived = false
       group by t.school_id, t.config, p.teacher_id
       order by t.school_id, p.teacher_id`
    );

    const mismatches = [];
    for (const row of qTeacherRows.rows) {
      const cfg = row.config || {};
      const dayOrder = Array.isArray(cfg.dayOrder) && cfg.dayOrder.length > 0 ? cfg.dayOrder : ['Monday','Tuesday','Wednesday','Thursday','Friday'];
      const expected = slotCountFromConfig(cfg) * dayOrder.length;
      if (Number(row.physical_count) !== expected) {
        mismatches.push({
          school_id: row.school_id,
          teacher_id: row.teacher_id,
          expected,
          actual: Number(row.physical_count)
        });
      }
    }
    push('Physical timetable row count matches template slots', mismatches.length === 0, { checkedTeachers: qTeacherRows.rowCount, mismatches });

    report.details.samplePermissionRows = qPerm.rows.slice(0, 12);

    const failed = report.checks.filter((c) => !c.pass).length;
    report.summary = {
      total: report.checks.length,
      passed: report.checks.length - failed,
      failed
    };

    console.log(JSON.stringify(report, null, 2));
    process.exitCode = failed > 0 ? 2 : 0;
  } catch (err) {
    console.error('AUDIT_ERROR', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
