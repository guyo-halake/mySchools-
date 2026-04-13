const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const DEFAULT_CFG = {
  schoolStartTime: '08:00',
  classStartTime: '08:00',
  classEndTime: '15:00',
  schoolEndTime: '15:30',
  periodMinutes: 45,
  dayOrder: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  breaks: [
    { id: 'break-1', afterPeriods: 2, durationMinutes: 20, label: 'Morning Break' },
    { id: 'break-2', afterPeriods: 4, durationMinutes: 30, label: 'Lunch Break' }
  ],
  customEntries: []
};

function mins(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return h * 60 + m;
}

function toClock(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function classSlots(cfg) {
  const breakMap = new Map();
  for (const b of cfg.breaks || []) {
    const after = Number(b?.afterPeriods || 0);
    if (after > 0) breakMap.set(after, { durationMinutes: Number(b?.durationMinutes || 0), label: b?.label || 'Break' });
  }

  let current = mins(cfg.classStartTime || cfg.schoolStartTime);
  const end = mins(cfg.classEndTime || cfg.schoolEndTime);
  let periods = 0;
  const slots = [];

  while (current < end) {
    const classEnd = current + Number(cfg.periodMinutes || 45);
    if (classEnd > end) break;
    slots.push({ start: toClock(current), end: toClock(classEnd) });
    current = classEnd;
    periods += 1;
    if (breakMap.has(periods)) {
      const d = breakMap.get(periods).durationMinutes;
      const breakEnd = current + d;
      if (breakEnd <= end) current = breakEnd;
    }
  }

  return slots;
}

function normalizeConfig(raw) {
  const cfg = raw || {};
  const normalized = {
    ...cfg,
    schoolStartTime: cfg.schoolStartTime || DEFAULT_CFG.schoolStartTime,
    classStartTime: cfg.classStartTime || cfg.schoolStartTime || DEFAULT_CFG.classStartTime,
    classEndTime: cfg.classEndTime || cfg.schoolEndTime || DEFAULT_CFG.classEndTime,
    schoolEndTime: cfg.schoolEndTime || DEFAULT_CFG.schoolEndTime,
    periodMinutes: Number(cfg.periodMinutes || DEFAULT_CFG.periodMinutes),
    dayOrder: Array.isArray(cfg.dayOrder) && cfg.dayOrder.length > 0 ? cfg.dayOrder : DEFAULT_CFG.dayOrder,
    breaks: Array.isArray(cfg.breaks) && cfg.breaks.length > 0
      ? cfg.breaks.map((b, idx) => ({
          id: b.id || `break-${idx + 1}`,
          afterPeriods: Math.max(1, Number(b.afterPeriods || idx + 1)),
          durationMinutes: Math.max(5, Number(b.durationMinutes || 20)),
          label: b.label || `Break ${idx + 1}`
        }))
      : DEFAULT_CFG.breaks,
    customEntries: Array.isArray(cfg.customEntries)
      ? cfg.customEntries
      : []
  };
  return normalized;
}

(async () => {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('BEGIN');

    const templates = await client.query(
      `select id, school_id, config
       from templates
       where key = 'TIMETABLE_CLASSES' and archived = false`
    );

    for (const t of templates.rows) {
      const normalized = normalizeConfig(t.config || {});
      await client.query(
        `update templates
         set config = $1::jsonb,
             updated_at = now()
         where id = $2`,
        [JSON.stringify(normalized), t.id]
      );
    }

    const teacherRows = await client.query(
      `select school_id, teacher_id
       from physical_timetable_entries
       group by school_id, teacher_id`
    );

    for (const tr of teacherRows.rows) {
      const tRes = await client.query(
        `select config
         from templates
         where school_id = $1 and key = 'TIMETABLE_CLASSES' and archived = false
         limit 1`,
        [tr.school_id]
      );
      if (!tRes.rowCount) continue;

      const cfg = normalizeConfig(tRes.rows[0].config || {});
      const days = cfg.dayOrder;
      const slots = classSlots(cfg);
      const expected = days.length * slots.length;

      const existingRes = await client.query(
        `select *
         from physical_timetable_entries
         where school_id = $1 and teacher_id = $2
         order by day_of_week, start_time`,
        [tr.school_id, tr.teacher_id]
      );
      const existing = existingRes.rows;
      if (existing.length === expected) continue;

      const byDay = new Map();
      for (const day of days) {
        byDay.set(day, existing.filter((r) => r.day_of_week === day).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))));
      }

      const rebuilt = [];
      let idx = 0;
      for (const day of days) {
        const oldRows = byDay.get(day) || [];
        for (let i = 0; i < slots.length; i += 1) {
          const old = oldRows[i] || null;
          rebuilt.push({
            school_id: tr.school_id,
            teacher_id: tr.teacher_id,
            day_of_week: day,
            start_time: slots[i].start,
            end_time: slots[i].end,
            subject_id: old?.subject_id || null,
            stream_id: old?.stream_id || null,
            class_label: old?.class_label || 'Class',
            room: old?.room || `Room ${String((idx % 10) + 1)}`,
            note: old?.note || null,
            is_mine: old?.is_mine || false
          });
          idx += 1;
        }
      }

      await client.query(
        `delete from physical_timetable_entries where school_id = $1 and teacher_id = $2`,
        [tr.school_id, tr.teacher_id]
      );

      for (const row of rebuilt) {
        await client.query(
          `insert into physical_timetable_entries
            (school_id, teacher_id, day_of_week, start_time, end_time, subject_id, stream_id, class_label, room, note, is_mine)
           values
            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            row.school_id,
            row.teacher_id,
            row.day_of_week,
            row.start_time,
            row.end_time,
            row.subject_id,
            row.stream_id,
            row.class_label,
            row.room,
            row.note,
            row.is_mine
          ]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Remediation completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Remediation failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
