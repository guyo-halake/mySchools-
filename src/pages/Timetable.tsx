import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Clock, Plus, Upload, Video, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Button, Card, Badge, Modal } from '../components/UI';

type TabMode = 'PHYSICAL' | 'LIVE';

type PhysicalEntry = {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject_id: string | null;
  stream_id: string | null;
  class_label: string;
  room: string | null;
  note: string | null;
  is_mine: boolean;
};

type LiveEntry = {
  id: string;
  entry_type: 'LIVE' | 'PRERECORDED' | 'HOLIDAY_ASSIGNMENT';
  template_key: string | null;
  template_slot_start: string | null;
  template_slot_end: string | null;
  day_of_week: string | null;
  start_at: string | null;
  end_at: string | null;
  subject_id: string | null;
  stream_id: string | null;
  topic: string | null;
  teacher_name: string | null;
  class_label: string | null;
  deadline: string | null;
  source_url: string | null;
  status: string | null;
};

type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  entry: PhysicalEntry | null;
};

type ActionMode = 'CHOICE' | 'CREATE_SESSION' | 'UPLOAD_PDF';

type TimetableBreak = {
  afterPeriods: number;
  durationMinutes: number;
  label?: string;
};

type TimetableConfig = {
  schoolStartTime: string;
  classStartTime: string;
  classEndTime: string;
  schoolEndTime: string;
  periodMinutes: number;
  dayOrder: string[];
  breaks: TimetableBreak[];
  defaultClassLabel: string;
  roomPrefix: string;
  enforceLiveSlotAlignment: boolean;
  subjectSelectionLimit: number;
  fallbackStreamCount: number;
  preferClassTeacherStreams: boolean;
  customEntries: Array<{ id?: string; name: string; type: string; startTime: string; endTime: string }>;
};

type Slot = {
  start: string;
  end: string;
  isBreak: boolean;
  label?: string;
};

const DEFAULT_TIMETABLE_CONFIG: TimetableConfig = {
  schoolStartTime: '08:00',
  classStartTime: '08:00',
  classEndTime: '13:10',
  schoolEndTime: '13:10',
  periodMinutes: 45,
  dayOrder: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  breaks: [
    { afterPeriods: 2, durationMinutes: 20, label: 'Break' },
    { afterPeriods: 4, durationMinutes: 20, label: 'Break' }
  ],
  defaultClassLabel: 'Class',
  roomPrefix: 'Room',
  enforceLiveSlotAlignment: true,
  subjectSelectionLimit: 8,
  fallbackStreamCount: 2,
  preferClassTeacherStreams: true,
  customEntries: []
};

const CLASSROOM_STORAGE_BUCKET = 'classroom-files';

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const toClock = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const buildSlotsFromTemplate = (config: TimetableConfig): Slot[] => {
  const breakMap = new Map<number, TimetableBreak>();
  config.breaks.forEach((b) => breakMap.set(b.afterPeriods, b));

  const slots: Slot[] = [];
  let current = toMinutes(config.classStartTime || config.schoolStartTime);
  const end = toMinutes(config.classEndTime || config.schoolEndTime);
  let periods = 0;

  while (current < end) {
    const classEnd = current + config.periodMinutes;
    if (classEnd > end) break;

    slots.push({
      start: toClock(current),
      end: toClock(classEnd),
      isBreak: false
    });

    current = classEnd;
    periods += 1;

    const breakAfter = breakMap.get(periods);
    if (breakAfter) {
      const breakEnd = current + breakAfter.durationMinutes;
      if (breakEnd <= end) {
        slots.push({
          start: toClock(current),
          end: toClock(breakEnd),
          isBreak: true,
          label: breakAfter.label || 'Break'
        });
        current = breakEnd;
      }
    }
  }

  return slots;
};

const requiredTemplateFields = ['schoolStartTime', 'classStartTime', 'classEndTime', 'schoolEndTime', 'periodMinutes', 'dayOrder', 'breaks', 'defaultClassLabel', 'roomPrefix', 'enforceLiveSlotAlignment', 'subjectSelectionLimit', 'fallbackStreamCount', 'preferClassTeacherStreams', 'customEntries'];

const getClassSignature = (entries: PhysicalEntry[]) => {
  return entries
    .map((item) => `${item.day_of_week}|${item.start_time}|${item.end_time}`)
    .sort()
    .join('||');
};

const toInputDateTime = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getClock = (isoOrInput: string) => {
  const dt = new Date(isoOrInput);
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
};

const nextTemplateSlotForNow = (dayOrder: string[], classOnlySlots: Slot[]) => {
  if (!dayOrder.length || !classOnlySlots.length) return null;

  const now = new Date();
  for (let offset = 0; offset <= 21; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    const dayName = candidate.toLocaleDateString('en-GB', { weekday: 'long' });
    if (!dayOrder.includes(dayName)) continue;

    for (const slot of classOnlySlots) {
      const [sh, sm] = slot.start.split(':').map(Number);
      const [eh, em] = slot.end.split(':').map(Number);
      const start = new Date(candidate);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(candidate);
      end.setHours(eh, em, 0, 0);

      if (offset > 0 || start.getTime() > now.getTime()) {
        return {
          startAt: toInputDateTime(start),
          endAt: toInputDateTime(end)
        };
      }
    }
  }

  return null;
};

export const Timetable: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<TabMode>('PHYSICAL');
  const [streams, setStreams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [physicalEntries, setPhysicalEntries] = useState<PhysicalEntry[]>([]);
  const [liveEntries, setLiveEntries] = useState<LiveEntry[]>([]);
  const [timetableConfig, setTimetableConfig] = useState<TimetableConfig>(DEFAULT_TIMETABLE_CONFIG);
  const [templateMissingFields, setTemplateMissingFields] = useState<string[]>([]);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, entry: null });

  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionMode, setActionMode] = useState<ActionMode>('CHOICE');
  const [uploading, setUploading] = useState(false);
  const [createForm, setCreateForm] = useState({
    entryType: 'LIVE' as LiveEntry['entry_type'],
    streamId: '',
    subjectId: '',
    topic: '',
    startAt: '',
    endAt: '',
    deadline: ''
  });
  const [uploadForm, setUploadForm] = useState({
    streamId: '',
    subjectId: '',
    deadline: ''
  });

  const subjectNameById = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((s: any) => map.set(s.id, s.name));
    return map;
  }, [subjects]);

  const days = useMemo(() => {
    const configured = Array.isArray(timetableConfig.dayOrder) && timetableConfig.dayOrder.length > 0
      ? timetableConfig.dayOrder
      : DEFAULT_TIMETABLE_CONFIG.dayOrder;
    return configured;
  }, [timetableConfig.dayOrder]);

  const classSlots = useMemo(() => buildSlotsFromTemplate(timetableConfig), [timetableConfig]);
  const classOnlySlots = useMemo(() => classSlots.filter((slot) => !slot.isBreak), [classSlots]);
  const customTemplateEntries = useMemo(() => {
    return Array.isArray(timetableConfig.customEntries) ? timetableConfig.customEntries : [];
  }, [timetableConfig]);

  const specialTemplateEntries = useMemo(() => {
    const breakEntries = classSlots
      .filter((slot) => slot.isBreak)
      .map((slot, idx) => ({
        id: `slot-break-${idx}`,
        name: slot.label || 'Break',
        type: 'BREAKS_LUNCH',
        startTime: slot.start,
        endTime: slot.end
      }));

    const customEntries = customTemplateEntries.map((item, idx) => ({
      id: item.id || `custom-${idx}`,
      name: item.name,
      type: item.type,
      startTime: item.startTime,
      endTime: item.endTime
    }));

    return [...breakEntries, ...customEntries];
  }, [classSlots, customTemplateEntries]);

  const dayPhysicalEntries = useMemo(() => {
    const result: Record<string, PhysicalEntry[]> = {};
    days.forEach((day) => {
      result[day] = physicalEntries
        .filter((item) => item.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    return result;
  }, [days, physicalEntries]);

  useEffect(() => {
    const in2d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    setUploadForm((prev) => ({
      ...prev,
      deadline: prev.deadline || toInputDateTime(in2d)
    }));
  }, []);

  useEffect(() => {
    const nextSlot = nextTemplateSlotForNow(days, classOnlySlots);
    const in2d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    if (!nextSlot) return;

    setCreateForm((prev) => ({
      ...prev,
      startAt: nextSlot.startAt,
      endAt: nextSlot.endAt,
      deadline: prev.deadline || toInputDateTime(in2d)
    }));
  }, [days, classOnlySlots]);

  const loadData = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      const [schoolStreams, schoolSubjects] = await Promise.all([
        api.getStreams(user.school_id),
        api.getSubjects(user.school_id)
      ]);
      setStreams(schoolStreams || []);
      setSubjects(schoolSubjects || []);

      const { data: timetableTemplate } = await supabase
        .from('templates')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('key', 'TIMETABLE_CLASSES')
        .eq('archived', false)
        .maybeSingle();

      const templateConfig = timetableTemplate?.config as Partial<TimetableConfig> | null;
      const missing = templateConfig
        ? requiredTemplateFields.filter((key) => (templateConfig as any)[key] === undefined || (templateConfig as any)[key] === null)
        : requiredTemplateFields;
      setTemplateMissingFields(missing);

      const runtimeConfig: TimetableConfig = {
        schoolStartTime: templateConfig?.schoolStartTime || DEFAULT_TIMETABLE_CONFIG.schoolStartTime,
        classStartTime: templateConfig?.classStartTime || templateConfig?.schoolStartTime || DEFAULT_TIMETABLE_CONFIG.schoolStartTime,
        classEndTime: templateConfig?.classEndTime || templateConfig?.schoolEndTime || DEFAULT_TIMETABLE_CONFIG.schoolEndTime,
        schoolEndTime: templateConfig?.schoolEndTime || DEFAULT_TIMETABLE_CONFIG.schoolEndTime,
        periodMinutes: Number(templateConfig?.periodMinutes || DEFAULT_TIMETABLE_CONFIG.periodMinutes),
        dayOrder: Array.isArray(templateConfig?.dayOrder) && templateConfig?.dayOrder.length > 0
          ? templateConfig.dayOrder
          : DEFAULT_TIMETABLE_CONFIG.dayOrder,
        breaks: Array.isArray(templateConfig?.breaks) && templateConfig?.breaks.length > 0
          ? templateConfig.breaks as TimetableBreak[]
          : DEFAULT_TIMETABLE_CONFIG.breaks,
        defaultClassLabel: String(templateConfig?.defaultClassLabel || DEFAULT_TIMETABLE_CONFIG.defaultClassLabel),
        roomPrefix: String(templateConfig?.roomPrefix || DEFAULT_TIMETABLE_CONFIG.roomPrefix),
        enforceLiveSlotAlignment: typeof templateConfig?.enforceLiveSlotAlignment === 'boolean'
          ? templateConfig.enforceLiveSlotAlignment
          : DEFAULT_TIMETABLE_CONFIG.enforceLiveSlotAlignment,
        subjectSelectionLimit: Math.max(1, Number(templateConfig?.subjectSelectionLimit || DEFAULT_TIMETABLE_CONFIG.subjectSelectionLimit)),
        fallbackStreamCount: Math.max(1, Number(templateConfig?.fallbackStreamCount || DEFAULT_TIMETABLE_CONFIG.fallbackStreamCount)),
        preferClassTeacherStreams: typeof templateConfig?.preferClassTeacherStreams === 'boolean'
          ? templateConfig.preferClassTeacherStreams
          : DEFAULT_TIMETABLE_CONFIG.preferClassTeacherStreams,
        customEntries: Array.isArray(templateConfig?.customEntries)
          ? templateConfig.customEntries as TimetableConfig['customEntries']
          : DEFAULT_TIMETABLE_CONFIG.customEntries
      };

      // Self-heal missing keys by writing normalized config back to template.
      if (missing.length > 0 && timetableTemplate?.id) {
        await supabase
          .from('templates')
          .update({
            config: {
              ...(templateConfig || {}),
              ...runtimeConfig
            },
            updated_by: user.id
          })
          .eq('id', timetableTemplate.id)
          .eq('school_id', user.school_id);
        setTemplateMissingFields([]);
      }

      setTimetableConfig(runtimeConfig);

      const { data: physical } = await supabase
        .from('physical_timetable_entries')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('teacher_id', user.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      const existingPhysical = (physical || []) as PhysicalEntry[];
      const nextSlots = buildSlotsFromTemplate(runtimeConfig);
      const expectedEntries = runtimeConfig.dayOrder.length * nextSlots.filter((slot) => !slot.isBreak).length;

      if (!physical || physical.length === 0) {
        await seedPhysicalEntries(schoolStreams || [], schoolSubjects || [], nextSlots, runtimeConfig.dayOrder, runtimeConfig);
      } else {
        const actualSignature = getClassSignature(existingPhysical);
        const expectedSignature = getClassSignature(
          runtimeConfig.dayOrder.flatMap((day) =>
            nextSlots
              .filter((slot) => !slot.isBreak)
              .map((slot, idx) => ({
                id: `${day}-${slot.start}-${idx}`,
                day_of_week: day,
                start_time: slot.start,
                end_time: slot.end,
                subject_id: null,
                stream_id: null,
                class_label: '',
                room: null,
                note: null,
                is_mine: false
              }))
          )
        );

        const mustResync = existingPhysical.length !== expectedEntries || actualSignature !== expectedSignature;
        if (mustResync) {
          await regeneratePhysicalEntries(existingPhysical, schoolStreams || [], schoolSubjects || [], nextSlots, runtimeConfig.dayOrder, runtimeConfig);
        } else {
          setPhysicalEntries(existingPhysical);
        }
      }

      const [liveTableRes, sessionRes] = await Promise.all([
        supabase
          .from('live_timetable_entries')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('teacher_id', user.id)
          .eq('template_key', 'TIMETABLE_CLASSES')
          .order('start_at', { ascending: true }),
        supabase
          .from('classroom_sessions')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('teacher_id', user.id)
          .eq('template_key', 'TIMETABLE_CLASSES')
          .in('status', ['LIVE', 'SCHEDULED'])
          .order('scheduled_start_at', { ascending: true })
      ]);

      const tableRows = (liveTableRes.data || []) as LiveEntry[];
      const sessionRows = (sessionRes.data || []).map((row: any) => ({
        id: `session-${row.id}`,
        entry_type: 'LIVE' as const,
        template_key: row.template_key || null,
        template_slot_start: row.start_time || null,
        template_slot_end: row.end_time || null,
        day_of_week: row.day_name || null,
        start_at: row.scheduled_start_at || null,
        end_at: row.scheduled_end_at || null,
        subject_id: row.subject_id || null,
        stream_id: row.stream_id || null,
        topic: row.topic || row.title || null,
        teacher_name: user.full_name || 'Teacher',
        class_label: row.class_label || null,
        deadline: row.auto_close_at || null,
        source_url: row.room_url || null,
        status: row.status || null
      }));

      setLiveEntries([...tableRows, ...sessionRows]);
    } catch (err) {
      console.error('Failed to load timetable', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, user?.school_id]);

  useEffect(() => {
    if (!user?.school_id) return;

    const channel = supabase
      .channel(`timetable-realtime-${user.school_id}-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'templates' }, () => {
        loadData().catch((err) => console.error('Realtime refresh failed (templates)', err));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'physical_timetable_entries' }, () => {
        loadData().catch((err) => console.error('Realtime refresh failed (physical)', err));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_timetable_entries' }, () => {
        loadData().catch((err) => console.error('Realtime refresh failed (live)', err));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_sessions' }, () => {
        loadData().catch((err) => console.error('Realtime refresh failed (sessions)', err));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.school_id]);

  useEffect(() => {
    const closeMenu = () => setContextMenu({ visible: false, x: 0, y: 0, entry: null });
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const seedPhysicalEntries = async (
    streamRows: any[],
    subjectRows: any[],
    slots: Slot[],
    dayOrder: string[] = days,
    config: TimetableConfig = timetableConfig
  ) => {
    if (!user?.school_id) return;
    const teacherStreams = streamRows.filter((s: any) => s.class_teacher_id === user.id);
    const scopedSubjects = subjectRows.slice(0, config.subjectSelectionLimit);
    const classes = config.preferClassTeacherStreams && teacherStreams.length
      ? teacherStreams
      : streamRows.slice(0, config.fallbackStreamCount);

    const entries: any[] = [];
    let idx = 0;
    for (const day of dayOrder) {
      for (const slot of slots.filter((s) => !s.isBreak)) {
        const stream = classes[idx % Math.max(1, classes.length)];
        const subject = scopedSubjects[idx % Math.max(1, scopedSubjects.length)];
        entries.push({
          school_id: user.school_id,
          teacher_id: user.id,
          day_of_week: day,
          start_time: slot.start,
          end_time: slot.end,
          subject_id: subject?.id || null,
          stream_id: stream?.id || null,
          class_label: `${stream?.class?.name || 'Form'} ${stream?.name || ''}`.trim() || config.defaultClassLabel,
          room: `${config.roomPrefix} ${(idx % 10) + 1}`,
          is_mine: false
        });
        idx += 1;
      }
    }

    const { data } = await supabase.from('physical_timetable_entries').insert(entries).select('*');
    setPhysicalEntries((data || []) as PhysicalEntry[]);
  };

  const regeneratePhysicalEntries = async (
    existing: PhysicalEntry[],
    streamRows: any[],
    subjectRows: any[],
    slots: Slot[],
    dayOrder: string[],
    config: TimetableConfig
  ) => {
    if (!user?.school_id) return;

    const teacherStreams = streamRows.filter((s: any) => s.class_teacher_id === user.id);
    const scopedSubjects = subjectRows.slice(0, config.subjectSelectionLimit);
    const classes = config.preferClassTeacherStreams && teacherStreams.length
      ? teacherStreams
      : streamRows.slice(0, config.fallbackStreamCount);
    const classOnly = slots.filter((slot) => !slot.isBreak);

    const existingByDay = new Map<string, PhysicalEntry[]>();
    dayOrder.forEach((day) => {
      const list = existing
        .filter((item) => item.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      existingByDay.set(day, list);
    });

    const rebuilt: any[] = [];
    let idx = 0;
    for (const day of dayOrder) {
      const oldRows = existingByDay.get(day) || [];
      for (let slotIdx = 0; slotIdx < classOnly.length; slotIdx += 1) {
        const slot = classOnly[slotIdx];
        const old = oldRows[slotIdx] || null;
        const stream = old?.stream_id
          ? streamRows.find((s: any) => s.id === old.stream_id)
          : classes[idx % Math.max(1, classes.length)];
        const subject = old?.subject_id
          ? subjectRows.find((s: any) => s.id === old.subject_id)
          : scopedSubjects[idx % Math.max(1, scopedSubjects.length)];

        rebuilt.push({
          school_id: user.school_id,
          teacher_id: user.id,
          day_of_week: day,
          start_time: slot.start,
          end_time: slot.end,
          subject_id: old?.subject_id || subject?.id || null,
          stream_id: old?.stream_id || stream?.id || null,
          class_label: old?.class_label || `${stream?.class?.name || 'Form'} ${stream?.name || ''}`.trim() || config.defaultClassLabel,
          room: old?.room || `${config.roomPrefix} ${(idx % 10) + 1}`,
          note: old?.note || null,
          is_mine: old?.is_mine || false
        });
        idx += 1;
      }
    }

    await supabase
      .from('physical_timetable_entries')
      .delete()
      .eq('school_id', user.school_id)
      .eq('teacher_id', user.id);

    const { data } = await supabase
      .from('physical_timetable_entries')
      .insert(rebuilt)
      .select('*');

    setPhysicalEntries((data || []) as PhysicalEntry[]);
  };

  const handleMarkMine = async () => {
    if (!contextMenu.entry) return;
    await supabase
      .from('physical_timetable_entries')
      .update({ is_mine: true })
      .eq('id', contextMenu.entry.id);

    setPhysicalEntries((prev) => prev.map((item) => item.id === contextMenu.entry?.id ? { ...item, is_mine: true } : item));
    setContextMenu({ visible: false, x: 0, y: 0, entry: null });
  };

  const handleAddText = async () => {
    if (!contextMenu.entry) return;
    const text = window.prompt('Add note text for this subject card:');
    if (!text?.trim()) return;

    await supabase
      .from('physical_timetable_entries')
      .update({ note: text.trim() })
      .eq('id', contextMenu.entry.id);

    setPhysicalEntries((prev) => prev.map((item) => item.id === contextMenu.entry?.id ? { ...item, note: text.trim() } : item));
    setContextMenu({ visible: false, x: 0, y: 0, entry: null });
  };

  const handleAddTask = async () => {
    if (!contextMenu.entry || !user?.school_id) return;
    const taskText = window.prompt('Task / Reminder text:');
    if (!taskText?.trim()) return;

    await supabase.from('physical_timetable_card_actions').insert({
      school_id: user.school_id,
      teacher_id: user.id,
      entry_id: contextMenu.entry.id,
      action_type: 'TASK',
      payload: { text: taskText.trim(), createdAt: new Date().toISOString() }
    });

    setContextMenu({ visible: false, x: 0, y: 0, entry: null });
  };

  const createLiveSessionEntry = async () => {
    if (!user?.school_id || !createForm.subjectId || !createForm.streamId || !createForm.startAt || !createForm.endAt) return;

    const stream = streams.find((s: any) => s.id === createForm.streamId);
    const dayName = new Date(createForm.startAt).toLocaleDateString('en-GB', { weekday: 'long' });
    const selectedStart = getClock(createForm.startAt);
    const selectedEnd = getClock(createForm.endAt);

    if (!days.includes(dayName)) {
      window.alert('Selected date is outside the template day order. Choose a timetable day.');
      return;
    }

    if (timetableConfig.enforceLiveSlotAlignment) {
      const exactTemplateSlot = classOnlySlots.some((slot) => slot.start === selectedStart && slot.end === selectedEnd);
      if (!exactTemplateSlot) {
        window.alert('Live session time must match one template class slot exactly.');
        return;
      }
    }

    await supabase.from('live_timetable_entries').insert({
      school_id: user.school_id,
      teacher_id: user.id,
      entry_type: createForm.entryType,
      template_key: 'TIMETABLE_CLASSES',
      template_slot_start: selectedStart,
      template_slot_end: selectedEnd,
      day_of_week: dayName,
      start_at: new Date(createForm.startAt).toISOString(),
      end_at: new Date(createForm.endAt).toISOString(),
      subject_id: createForm.subjectId,
      stream_id: createForm.streamId,
      topic: createForm.topic || null,
      teacher_name: user.full_name || 'Teacher',
      class_label: `${stream?.class?.name || 'Form'} ${stream?.name || ''}`.trim(),
      deadline: createForm.deadline ? new Date(createForm.deadline).toISOString() : null,
      status: createForm.entryType === 'LIVE' ? 'SCHEDULED' : 'PUBLISHED'
    });

    setIsActionModalOpen(false);
    setActionMode('CHOICE');
    await loadData();
  };

  const uploadPdfEntry = async (file: File) => {
    if (!user?.school_id || !uploadForm.subjectId || !uploadForm.streamId) return;
    setUploading(true);
    try {
      const safeName = `${Date.now()}-${sanitizeFileName(file.name)}`;
      const path = `${user.school_id}/timetable-pdfs/${safeName}`;
      const uploadRes = await supabase.storage.from(CLASSROOM_STORAGE_BUCKET).upload(path, file, { upsert: true });
      if (uploadRes.error) throw uploadRes.error;
      const publicUrl = supabase.storage.from(CLASSROOM_STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;

      const stream = streams.find((s: any) => s.id === uploadForm.streamId);
      await supabase.from('live_timetable_entries').insert({
        school_id: user.school_id,
        teacher_id: user.id,
        entry_type: 'HOLIDAY_ASSIGNMENT',
        template_key: 'TIMETABLE_CLASSES',
        template_slot_start: null,
        template_slot_end: null,
        day_of_week: null,
        start_at: null,
        end_at: null,
        subject_id: uploadForm.subjectId,
        stream_id: uploadForm.streamId,
        topic: file.name,
        teacher_name: user.full_name || 'Teacher',
        class_label: `${stream?.class?.name || 'Form'} ${stream?.name || ''}`.trim(),
        deadline: uploadForm.deadline ? new Date(uploadForm.deadline).toISOString() : null,
        source_url: publicUrl,
        status: 'PUBLISHED'
      });

      setIsActionModalOpen(false);
      setActionMode('CHOICE');
      await loadData();
    } catch (err) {
      console.error('Failed to upload PDF', err);
    } finally {
      setUploading(false);
    }
  };

  const physicalCell = (day: string, classIndex: number) => {
    return (dayPhysicalEntries[day] || [])[classIndex] || null;
  };

  if (loading) {
    return <div className="py-16 text-sm font-semibold text-zinc-500">Loading timetable...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Timetable</h1>
          <p className="text-sm text-zinc-500">Manage physical classes and live timetable cards from one place.</p>
          {templateMissingFields.length > 0 && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1">
              <Badge variant="warning">Template fallback active</Badge>
              <p className="text-[11px] text-amber-700">Missing keys: {templateMissingFields.join(', ')}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => { setLoading(true); loadData().finally(() => setLoading(false)); }}
            disabled={loading}
          >
            🔄 Reload
          </Button>
          <Button variant={mode === 'PHYSICAL' ? 'primary' : 'outline'} onClick={() => setMode('PHYSICAL')}>PHYSICAL CLASSES</Button>
          <Button variant={mode === 'LIVE' ? 'primary' : 'outline'} onClick={() => setMode('LIVE')}>LIVE</Button>
        </div>
      </div>

      {mode === 'PHYSICAL' ? (
        <Card title="Physical Timetable" subtitle="Right-click any subject card for quick actions">
          {specialTemplateEntries.length > 0 && (
            <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold text-zinc-600">Custom timetable setup events</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {specialTemplateEntries.map((item, idx) => (
                  <Badge key={`${item.name}-${idx}`} variant="neutral">{item.name} ({item.type}) {item.startTime}-{item.endTime}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <table className="w-full min-w-[980px] border-collapse bg-white dark:bg-zinc-900">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-zinc-500">Time</th>
                  {days.map((day) => (
                    <th key={day} className="px-2 py-3 text-center text-[10px] uppercase tracking-wider text-zinc-500">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classSlots.map((slot) => {
                  let classIndex = -1;
                  for (let i = 0; i < classOnlySlots.length; i += 1) {
                    if (classOnlySlots[i].start === slot.start && classOnlySlots[i].end === slot.end) {
                      classIndex = i;
                      break;
                    }
                  }
                  return (
                  <tr key={`${slot.start}-${slot.end}`} className="border-b border-zinc-50 dark:border-zinc-800/60">
                    <td className="px-4 py-3 text-xs font-semibold text-zinc-600">{slot.start} - {slot.end}</td>
                    {days.map((day) => {
                      if (slot.isBreak) {
                        return (
                          <td key={`${day}-${slot.start}`} className="px-1 py-1 align-top">
                            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-2 py-3 text-center text-[11px] font-semibold text-amber-700">
                              {slot.label}
                            </div>
                          </td>
                        );
                      }

                      const row = classIndex >= 0 ? physicalCell(day, classIndex) : null;
                      return (
                        <td key={`${day}-${slot.start}`} className="px-1 py-1 align-top">
                          {row ? (
                            <div
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({ visible: true, x: e.clientX, y: e.clientY, entry: row });
                              }}
                              className={`min-h-[84px] rounded-xl border px-2 py-2 ${row.is_mine ? 'border-sky-300 bg-sky-50' : 'border-emerald-200 bg-emerald-50'}`}
                            >
                              <p className="text-[11px] font-bold leading-tight text-emerald-800">{subjectNameById.get(row.subject_id || '') || 'Subject'}</p>
                              <p className="mt-1 text-[10px] text-emerald-700">{row.class_label}</p>
                              <p className="mt-1 text-[10px] text-emerald-700">{row.room || 'Room'}</p>
                              {row.note && <p className="mt-1 text-[10px] text-zinc-600">{row.note}</p>}
                              {row.is_mine && <Badge variant="info">Mine</Badge>}
                            </div>
                          ) : (
                            <div className="min-h-[84px] rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card title="Live Timetable" subtitle="Live classes, prerecorded uploads, and holiday tasks">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="danger"><Video size={12} /> Live</Badge>
              <Badge variant="neutral"><FileText size={12} /> Prerecorded / PDFs</Badge>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setIsActionModalOpen(true);
                setActionMode('CHOICE');
              }}
            >
              <Plus size={14} />
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {liveEntries.length === 0 && <p className="text-xs text-zinc-400">No live timetable entries yet.</p>}
            {liveEntries.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.topic || subjectNameById.get(item.subject_id || '') || 'Class session'}</p>
                  <Badge variant={item.entry_type === 'LIVE' ? 'danger' : 'neutral'}>
                    {item.entry_type === 'LIVE' ? 'Live class' : item.entry_type === 'PRERECORDED' ? 'Prerecorded class' : 'Holiday assignment'}
                  </Badge>
                </div>

                <p className="mt-1 text-xs text-zinc-500">{subjectNameById.get(item.subject_id || '') || 'General'} • {item.class_label || 'Class'}</p>
                <p className="mt-1 text-xs text-zinc-500">Teacher: {item.teacher_name || user?.full_name || 'Teacher'}</p>
                <p className="mt-1 text-xs text-zinc-500">{item.start_at ? `${new Date(item.start_at).toLocaleString('en-GB')}` : 'Time not fixed'}</p>
                {item.deadline && <p className="mt-1 text-xs text-amber-700">Deadline: {new Date(item.deadline).toLocaleString('en-GB')}</p>}
                {item.source_url && (
                  <a className="mt-2 inline-block text-xs text-emerald-700" href={item.source_url} target="_blank" rel="noreferrer">Open source</a>
                )}
                {item.status && (
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-zinc-600"><CheckCircle2 size={12} /> {item.status}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {contextMenu.visible && contextMenu.entry && (
        <div
          className="fixed z-[120] w-44 rounded-lg border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button className="w-full rounded px-2 py-2 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={handleMarkMine}>Mark mine</button>
          <button className="w-full rounded px-2 py-2 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={handleAddText}>Add text</button>
          <button className="w-full rounded px-2 py-2 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={handleAddTask}>Add task/reminder</button>
        </div>
      )}

      <Modal isOpen={isActionModalOpen} onClose={() => { setIsActionModalOpen(false); setActionMode('CHOICE'); }} title="Add to Live Timetable">
        {actionMode === 'CHOICE' && (
          <div className="space-y-3">
            <Button className="w-full justify-center" onClick={() => setActionMode('CREATE_SESSION')}>Create a class session</Button>
            <Button className="w-full justify-center" variant="outline" onClick={() => setActionMode('UPLOAD_PDF')}>
              <Upload size={14} /> Upload PDFs
            </Button>
          </div>
        )}

        {actionMode === 'CREATE_SESSION' && (
          <div className="space-y-3">
            <select className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" value={createForm.entryType} onChange={(e) => setCreateForm((prev) => ({ ...prev, entryType: e.target.value as LiveEntry['entry_type'] }))}>
              <option value="LIVE">Live class</option>
              <option value="PRERECORDED">Prerecorded class</option>
            </select>
            <select className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" value={createForm.streamId} onChange={(e) => setCreateForm((prev) => ({ ...prev, streamId: e.target.value }))}>
              <option value="">Class / Stream</option>
              {streams.map((s: any) => <option key={s.id} value={s.id}>{`${s.class?.name || 'Form'} ${s.name || ''}`.trim()}</option>)}
            </select>
            <select className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" value={createForm.subjectId} onChange={(e) => setCreateForm((prev) => ({ ...prev, subjectId: e.target.value }))}>
              <option value="">Subject</option>
              {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" placeholder="Topic" value={createForm.topic} onChange={(e) => setCreateForm((prev) => ({ ...prev, topic: e.target.value }))} />
            <input type="datetime-local" className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" value={createForm.startAt} onChange={(e) => setCreateForm((prev) => ({ ...prev, startAt: e.target.value }))} />
            <input type="datetime-local" className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" value={createForm.endAt} onChange={(e) => setCreateForm((prev) => ({ ...prev, endAt: e.target.value }))} />
            <input type="datetime-local" className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" value={createForm.deadline} onChange={(e) => setCreateForm((prev) => ({ ...prev, deadline: e.target.value }))} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionMode('CHOICE')}>Back</Button>
              <Button onClick={() => createLiveSessionEntry().catch((err) => console.error('Failed creating live entry', err))}>Save session</Button>
            </div>
          </div>
        )}

        {actionMode === 'UPLOAD_PDF' && (
          <div className="space-y-3">
            <select className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" value={uploadForm.streamId} onChange={(e) => setUploadForm((prev) => ({ ...prev, streamId: e.target.value }))}>
              <option value="">Class / Stream</option>
              {streams.map((s: any) => <option key={s.id} value={s.id}>{`${s.class?.name || 'Form'} ${s.name || ''}`.trim()}</option>)}
            </select>
            <select className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" value={uploadForm.subjectId} onChange={(e) => setUploadForm((prev) => ({ ...prev, subjectId: e.target.value }))}>
              <option value="">Subject</option>
              {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="datetime-local" className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" value={uploadForm.deadline} onChange={(e) => setUploadForm((prev) => ({ ...prev, deadline: e.target.value }))} />
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadPdfEntry(file).catch((err) => console.error('Failed upload entry', err));
                e.currentTarget.value = '';
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionMode('CHOICE')}>Back</Button>
              <Button disabled={uploading || !uploadForm.streamId || !uploadForm.subjectId} onClick={() => fileInputRef.current?.click()}>
                {uploading ? 'Uploading...' : 'Select PDF'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Card>
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-zinc-500" />
          <p className="text-sm text-zinc-600">Timetable auto-sync: live sessions started from classroom templates also appear in Live tab.</p>
        </div>
      </Card>
    </div>
  );
};
