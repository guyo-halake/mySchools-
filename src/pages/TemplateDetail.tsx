import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Trash2, Plus, ChevronLeft, AlertCircle, CalendarDays, CalendarRange, Globe, History, Sparkles, BadgeInfo, Download, CheckCircle2, CircleDashed, PencilLine, CalendarPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Card, Badge } from '../components/UI';

type TemplateRow = {
  id: string;
  key: string;
  name: string;
  category: string;
  config: any;
  active: boolean;
  created_at: string;
  updated_at: string;
  school_id: string;
};

type PermissionRow = {
  template_key: string;
  role: string;
  can_view: boolean;
  can_use: boolean;
  can_edit: boolean;
};

type TimetableCustomType = 'CLASS' | 'ASSEMBLY' | 'EXAMS' | 'BREAKS_LUNCH' | 'CUSTOM';

type TimetableCustomEntry = {
  id: string;
  name: string;
  type: TimetableCustomType;
  startTime: string;
  endTime: string;
};

type TimetableBreakRow = {
  id: string;
  afterPeriods: number;
  durationMinutes: number;
  label: string;
};

type TimetableForm = {
  schoolStartTime: string;
  classStartTime: string;
  classEndTime: string;
  schoolEndTime: string;
  periodMinutes: number;
  dayOrder: string[];
  breaks: TimetableBreakRow[];
  defaultClassLabel: string;
  roomPrefix: string;
  enforceLiveSlotAlignment: boolean;
  subjectSelectionLimit: number;
  fallbackStreamCount: number;
  preferClassTeacherStreams: boolean;
  customEntries: TimetableCustomEntry[];
};

type TemplateRevisionRow = {
  id: string;
  school_id: string;
  key: string;
  config: any;
  action: string;
  changed_at: string;
};

type AcademicTerm = {
  termNumber: number;  // Flexible: can be 1, 2, 3 or more
  name: string;
  startDate: string;
  endDate: string;
  midTermStart?: string;  // Mid-term break start
  midTermEnd?: string;    // Mid-term break end
};

type AcademicHoliday = {
  id: string;
  kind: 'END_TERM' | 'MID_TERM';
  termNumber: number;  // Flexible: can reference any term
  startDate: string;
  endDate: string;
  notes: string;
  title?: string;
  sourceEventId?: string;
};

type AcademicEvent = {
  id: string;
  termNumber?: number;  // Optional: events may not be tied to a specific term
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  eventType: string;
  stopAllClasses: boolean;
  status: 'DRAFT' | 'PUBLISHED';
};

type AcademicCalendarForm = {
  year: number;
  timezone: string;
  periodType: 'TERMS' | 'SEMESTERS' | 'QUARTERS';  // Configurable: what does school use?
  termCount: number;  // Flexible: how many terms/semesters/quarters?
  terms: AcademicTerm[];
  holidays: AcademicHoliday[];
  events: AcademicEvent[];
};

type DbTermRow = {
  id: string;
  name: string;
  year: number;
  start_date: string | null;
  end_date: string | null;
};

type CalendarReleaseState = 'DRAFT' | 'PUBLISHED';

const defaultForm: TimetableForm = {
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
  defaultClassLabel: 'Class',
  roomPrefix: 'Room',
  enforceLiveSlotAlignment: true,
  subjectSelectionLimit: 8,
  fallbackStreamCount: 2,
  preferClassTeacherStreams: true,
  customEntries: []
};

const makeId = () => `entry-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const toClock = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const buildBreakTimeline = (form: TimetableForm) => {
  const breaks = [...form.breaks]
    .filter((item) => item.afterPeriods > 0 && item.durationMinutes > 0)
    .sort((a, b) => a.afterPeriods - b.afterPeriods);

  const breakMap = new Map<number, TimetableBreakRow>();
  breaks.forEach((item) => breakMap.set(item.afterPeriods, item));

  const classStart = toMinutes(form.classStartTime || form.schoolStartTime);
  const classEnd = toMinutes(form.classEndTime || form.schoolEndTime);
  let cursor = classStart;
  let period = 0;
  const rows: Array<{ id: string; name: string; type: TimetableCustomType; startTime: string; endTime: string }> = [];

  while (cursor < classEnd) {
    const nextClassEnd = cursor + form.periodMinutes;
    if (nextClassEnd > classEnd) break;

    cursor = nextClassEnd;
    period += 1;

    const brk = breakMap.get(period);
    if (brk) {
      const breakEnd = cursor + brk.durationMinutes;
      if (breakEnd <= classEnd) {
        rows.push({
          id: brk.id,
          name: brk.label || `Break after Period ${period}`,
          type: 'BREAKS_LUNCH',
          startTime: toClock(cursor),
          endTime: toClock(breakEnd)
        });
        cursor = breakEnd;
      }
    }
  }

  return rows;
};

const requiredTemplateFields = ['schoolStartTime', 'classStartTime', 'classEndTime', 'schoolEndTime', 'periodMinutes', 'dayOrder', 'breaks', 'defaultClassLabel', 'roomPrefix', 'enforceLiveSlotAlignment', 'subjectSelectionLimit', 'fallbackStreamCount', 'preferClassTeacherStreams', 'customEntries'];

const currentYear = new Date().getFullYear();
const machineTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const defaultCalendarForm: AcademicCalendarForm = {
  year: currentYear,
  timezone: machineTz,
  periodType: 'TERMS',  // School uses 'TERMS' or 'SEMESTERS' or 'QUARTERS'
  termCount: 3,  // Default: 3 terms, but school can configure any number
  terms: [
    { termNumber: 1, name: 'Term 1', startDate: '', endDate: '' },
    { termNumber: 2, name: 'Term 2', startDate: '', endDate: '' },
    { termNumber: 3, name: 'Term 3', startDate: '', endDate: '' }
  ],
  holidays: [
    { id: 'holiday-end-term', kind: 'END_TERM', termNumber: 3, startDate: '', endDate: '', notes: 'End of Term Holiday', title: 'End of Term Holiday' },
    { id: 'holiday-mid-term', kind: 'MID_TERM', termNumber: 2, startDate: '', endDate: '', notes: 'Mid Term Holiday', title: 'Mid Term Holiday' }
  ],
  events: [
    { id: 'event-custom', termNumber: 1, title: '', startDate: '', startTime: '09:00', endDate: '', endTime: '10:00', eventType: 'CUSTOM', stopAllClasses: false, status: 'DRAFT' }
  ]
};

const parseTermNumberFromName = (name: string): number | null => {
  const match = String(name || '').match(/term\s*(\d+)/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const dbTermLabel = (term: { name: string; year: number }) => {
  const termNo = parseTermNumberFromName(term.name);
  if (termNo) return `Term ${termNo} ${term.year}`;
  return `${term.name || 'Term'} ${term.year}`;
};

const serializeCalendarConfig = (calendar: AcademicCalendarForm, releaseState: CalendarReleaseState) => ({
  ...calendar,
  releaseState,
  holidays: calendar.holidays.map((holiday) => ({
    id: holiday.id,
    kind: holiday.kind,
    afterTermNumber: holiday.termNumber,
    startDate: holiday.startDate,
    endDate: holiday.endDate,
    notes: holiday.notes,
    title: holiday.title,
    sourceEventId: holiday.sourceEventId
  })),
  events: calendar.events.map((event) => ({
    id: event.id,
    termNumber: event.termNumber,
    title: event.title,
    startDate: event.startDate,
    startTime: event.startTime,
    endDate: event.endDate,
    endTime: event.endTime,
    eventType: event.eventType,
    stopAllClasses: event.stopAllClasses,
    status: event.status
  }))
});

const parseCalendarConfig = (cfg: any): AcademicCalendarForm => {
  // Get configured term count or default to 3
  const configuredTermCount = Number(cfg?.termCount);
  const termCount = Number.isFinite(configuredTermCount) && configuredTermCount > 0
    ? configuredTermCount
    : (Array.isArray(cfg?.terms) && cfg.terms.length > 0 ? cfg.terms.length : 3);
  const periodType = cfg?.periodType || 'TERMS';

  // Build terms array from config, or create defaults
  const terms: AcademicTerm[] = [];
  if (Array.isArray(cfg?.terms) && cfg.terms.length > 0) {
    // Use configured terms
    terms.push(
      ...cfg.terms.map((t: any, idx: number) => ({
        termNumber: Number(t?.termNumber ?? idx + 1),
        name: String(t?.name || `Term ${idx + 1}`),
        startDate: String(t?.startDate || ''),
        endDate: String(t?.endDate || ''),
        midTermStart: t?.midTermStart ? String(t.midTermStart) : undefined,
        midTermEnd: t?.midTermEnd ? String(t.midTermEnd) : undefined
      }))
    );
  } else {
    // Create default terms based on configured count
    for (let i = 1; i <= termCount; i++) {
      terms.push({
        termNumber: i,
        name: `Term ${i}`,
        startDate: '',
        endDate: ''
      });
    }
  }

  // Parse holidays from config
  const holidayFromConfig = Array.isArray(cfg?.holidays) ? cfg.holidays : [];
  const endTerm = holidayFromConfig.find((h: any) => String(h?.kind || '').toUpperCase() === 'END_TERM' || String(h?.holidayType || '').toUpperCase() === 'LONG_HOLIDAY');
  const midTerm = holidayFromConfig.find((h: any) => String(h?.kind || '').toUpperCase() === 'MID_TERM' || String(h?.holidayType || '').toUpperCase() === 'HALF_TERM');

  const holidays: AcademicHoliday[] = [
    {
      id: String(endTerm?.id || 'holiday-end-term'),
      kind: 'END_TERM',
      termNumber: Number(endTerm?.termNumber || endTerm?.afterTermNumber || termCount),
      startDate: String(endTerm?.startDate || ''),
      endDate: String(endTerm?.endDate || ''),
      notes: String(endTerm?.notes || 'End of Term Holiday')
    },
    {
      id: String(midTerm?.id || 'holiday-mid-term'),
      kind: 'MID_TERM',
      termNumber: Number(midTerm?.termNumber || midTerm?.afterTermNumber || Math.floor(termCount / 2)),
      startDate: String(midTerm?.startDate || ''),
      endDate: String(midTerm?.endDate || ''),
      notes: String(midTerm?.notes || 'Mid Term Holiday')
    }
  ];

  // Parse events from config
  const sourceEvents = Array.isArray(cfg?.events) && cfg.events.length > 0 ? cfg.events : [];
  const events: AcademicEvent[] = sourceEvents.length > 0
    ? sourceEvents.map((source: any, index: number) => ({
        id: String(source?.id || `event-${index + 1}`),
        termNumber: source?.termNumber ? Number(source.termNumber) : undefined,
        title: String(source?.title || ''),
        startDate: String(source?.startDate || ''),
        startTime: String(source?.startTime || '09:00'),
        endDate: String(source?.endDate || ''),
        endTime: String(source?.endTime || '10:00'),
        eventType: String(source?.eventType || 'CUSTOM'),
        stopAllClasses: Boolean(source?.stopAllClasses),
        status: String(source?.status || (source?.isDraft ? 'DRAFT' : 'PUBLISHED')).toUpperCase() === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
      }))
    : [
        {
          id: 'event-custom',
          termNumber: 1,
          title: '',
          startDate: '',
          startTime: '09:00',
          endDate: '',
          endTime: '10:00',
          eventType: 'CUSTOM',
          stopAllClasses: false,
          status: 'DRAFT'
        }
      ];

  return {
    year: Number(cfg?.year || currentYear),
    timezone: String(cfg?.timezone || machineTz),
    periodType: periodType as 'TERMS' | 'SEMESTERS' | 'QUARTERS',
    termCount,
    terms,
    holidays,
    events
  };
};

const formatDate = (value: string) => (value ? new Date(value).toLocaleDateString('en-GB') : '-');

const formatDateTime = (dateValue: string, timeValue: string) => {
  const date = formatDate(dateValue);
  if (date === '-') return '-';
  return `${date} ${timeValue || '--:--'}`;
};

const isValidDate = (value: string) => Boolean(value) && !Number.isNaN(new Date(value).getTime());

const normalizeDate = (value: string) => {
  if (!isValidDate(value)) return '';
  return new Date(value).toISOString().slice(0, 10);
};

const escapeIcsText = (value: string) => String(value || '')
  .replace(/\\/g, '\\\\')
  .replace(/\n/g, '\\n')
  .replace(/,/g, '\\,')
  .replace(/;/g, '\\;');

const formatDurationLabel = (startDate: string, endDate: string) => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return '-';
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (days <= 0) return '-';
  if (days < 7) return `${days} day${days === 1 ? '' : 's'}`;
  if (days > 28) {
    const months = Number((days / 30).toFixed(1));
    return `${months} month${months === 1 ? '' : 's'}`;
  }
  const weeks = Math.ceil(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'}`;
};

export const TemplateDetail: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingTimetable, setIsEditingTimetable] = useState(false);
  const [template, setTemplate] = useState<TemplateRow | null>(null);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [timetableForm, setTimetableForm] = useState<TimetableForm>(defaultForm);
  const [editTimetableForm, setEditTimetableForm] = useState<TimetableForm>(defaultForm);
  const [timetableTab, setTimetableTab] = useState<'SETTINGS' | 'CUSTOM'>('SETTINGS');
  const [isEditingCalendar, setIsEditingCalendar] = useState(false);
  const [templateMissingFields, setTemplateMissingFields] = useState<string[]>([]);
  const [revisions, setRevisions] = useState<TemplateRevisionRow[]>([]);
  const [calendarForm, setCalendarForm] = useState<AcademicCalendarForm>(defaultCalendarForm);
  const [editCalendarForm, setEditCalendarForm] = useState<AcademicCalendarForm>(defaultCalendarForm);
  const [dbTerms, setDbTerms] = useState<DbTermRow[]>([]);
  const [activeTermCardId, setActiveTermCardId] = useState<string | null>(null);
  const [expandedTermCardId, setExpandedTermCardId] = useState<string | null>(null);
  const [termEditorOpen, setTermEditorOpen] = useState(false);
  const [eventEditorOpen, setEventEditorOpen] = useState(false);
  const [managedEventId, setManagedEventId] = useState<string | null>(null);
  const [showTemplateControlAlert, setShowTemplateControlAlert] = useState(false);
  const [showStopClassAlert, setShowStopClassAlert] = useState(false);
  const [termManageDraft, setTermManageDraft] = useState({
    termId: '',
    termNumber: 1,
    name: '',
    startDate: '',
    endDate: ''
  });
  const [termEventDraft, setTermEventDraft] = useState({
    termId: '',
    termNumber: 1,
    title: '',
    eventType: 'HOLIDAY' as 'HOLIDAY' | 'ASSEMBLY' | 'SCHOOL_DAY',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '10:00',
    stopAllClasses: false,
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED'
  });
  const [newCustom, setNewCustom] = useState({
    name: '',
    type: 'CUSTOM' as TimetableCustomType,
    startTime: '09:00',
    endTime: '09:30'
  });
  const [newBreak, setNewBreak] = useState<TimetableBreakRow>({ id: makeId(), afterPeriods: 2, durationMinutes: 20, label: 'Break' });

  const currentRole = String(user?.role || '').toUpperCase();

  const hydrateCalendarFromDbTables = async (
    baseCalendar: AcademicCalendarForm,
    termsForYear: DbTermRow[]
  ): Promise<AcademicCalendarForm> => {
    if (!user?.school_id) return baseCalendar;

    const { data: academicYear, error: academicYearError } = await supabase
      .from('school_academic_years')
      .select('id')
      .eq('school_id', user.school_id)
      .eq('year', baseCalendar.year)
      .maybeSingle();

    if (academicYearError) throw academicYearError;
    if (!academicYear?.id) return baseCalendar;

    const [holidayRes, eventsRes] = await Promise.all([
      supabase
        .from('term_holidays')
        .select('id,after_term_number,holiday_type,start_date,end_date,notes')
        .eq('school_id', user.school_id)
        .eq('academic_year_id', academicYear.id)
        .order('start_date', { ascending: true }),
      supabase
        .from('school_calendar_events')
        .select('id,term_id,event_type,title,start_date,end_date,lock_results_workflow')
        .eq('school_id', user.school_id)
        .eq('academic_year_id', academicYear.id)
        .order('start_date', { ascending: true })
    ]);

    if (holidayRes.error) throw holidayRes.error;
    if (eventsRes.error) throw eventsRes.error;

    const termIdToNumber = new Map<string, number>();
    termsForYear.forEach((term) => {
      const termNo = parseTermNumberFromName(term.name);
      if (termNo) termIdToNumber.set(term.id, termNo);
    });

    const dbHolidays: AcademicHoliday[] = (holidayRes.data || []).map((holiday: any) => ({
      id: String(holiday.id),
      kind: String(holiday.holiday_type || '').toUpperCase() === 'HALF_TERM' ? 'MID_TERM' : 'END_TERM',
      termNumber: Number(holiday.after_term_number || 1),
      startDate: String(holiday.start_date || ''),
      endDate: String(holiday.end_date || ''),
      notes: String(holiday.notes || ''),
      title: String(holiday.notes || '')
    }));

    const dbEvents: AcademicEvent[] = (eventsRes.data || []).map((event: any) => ({
      id: String(event.id),
      termNumber: event.term_id ? termIdToNumber.get(String(event.term_id)) : undefined,
      title: String(event.title || ''),
      startDate: String(event.start_date || ''),
      startTime: '09:00',
      endDate: String(event.end_date || ''),
      endTime: '10:00',
      eventType: String(event.event_type || 'CUSTOM'),
      stopAllClasses: Boolean(event.lock_results_workflow),
      status: 'PUBLISHED'
    }));

    return {
      ...baseCalendar,
      holidays: dbHolidays.length > 0 ? dbHolidays : baseCalendar.holidays,
      events: dbEvents.length > 0 ? dbEvents : baseCalendar.events
    };
  };

  const persistCalendarData = async (nextCalendar: AcademicCalendarForm, releaseState: CalendarReleaseState) => {
    if (!template || !user?.school_id) throw new Error('Missing template or school context.');

    const calendarConfig = serializeCalendarConfig(nextCalendar, releaseState);
    const { error: rpcError } = await supabase.rpc('apply_calendar_template', {
      p_template_id: template.id,
      p_school_id: user.school_id,
      p_config: calendarConfig,
      p_updated_by: user.id
    });

    if (rpcError) throw rpcError;
  };

  const loadTemplate = async () => {
    if (!templateId || !user?.school_id) return;

    setLoading(true);
    try {
      const [templateRes, permissionRes, termsRes] = await Promise.all([
        supabase
          .from('templates')
          .select('*')
          .eq('id', templateId)
          .eq('school_id', user.school_id)
          .single(),
        supabase
          .from('template_permissions')
          .select('*')
          .eq('school_id', user.school_id),
        supabase
          .from('terms')
          .select('id,name,year,start_date,end_date')
          .eq('school_id', user.school_id)
          .order('year', { ascending: true })
          .order('name', { ascending: true })
      ]);

      setDbTerms((termsRes.data || []) as DbTermRow[]);

      if (templateRes.error) throw templateRes.error;
      if (permissionRes.error) throw permissionRes.error;
      if (termsRes.error) throw termsRes.error;

      if (templateRes.data) {
        setTemplate(templateRes.data as TemplateRow);
        
        // Load form for timetable templates
        if (templateRes.data.key === 'TIMETABLE_CLASSES' && templateRes.data.config) {
          const cfg = templateRes.data.config;
          const missing = requiredTemplateFields.filter((key) => cfg[key] === undefined || cfg[key] === null);
          setTemplateMissingFields(missing);

          const loadedForm: TimetableForm = {
            schoolStartTime: cfg.schoolStartTime || defaultForm.schoolStartTime,
            classStartTime: cfg.classStartTime || cfg.schoolStartTime || defaultForm.classStartTime,
            classEndTime: cfg.classEndTime || cfg.schoolEndTime || defaultForm.classEndTime,
            schoolEndTime: cfg.schoolEndTime || defaultForm.schoolEndTime,
            periodMinutes: Number(cfg.periodMinutes || defaultForm.periodMinutes),
            defaultClassLabel: String(cfg.defaultClassLabel || defaultForm.defaultClassLabel),
            roomPrefix: String(cfg.roomPrefix || defaultForm.roomPrefix),
            enforceLiveSlotAlignment: typeof cfg.enforceLiveSlotAlignment === 'boolean' ? cfg.enforceLiveSlotAlignment : defaultForm.enforceLiveSlotAlignment,
            subjectSelectionLimit: Math.max(1, Number(cfg.subjectSelectionLimit || defaultForm.subjectSelectionLimit)),
            fallbackStreamCount: Math.max(1, Number(cfg.fallbackStreamCount || defaultForm.fallbackStreamCount)),
            preferClassTeacherStreams: typeof cfg.preferClassTeacherStreams === 'boolean' ? cfg.preferClassTeacherStreams : defaultForm.preferClassTeacherStreams,
            dayOrder: Array.isArray(cfg.dayOrder) && cfg.dayOrder.length > 0 ? cfg.dayOrder : defaultForm.dayOrder,
            breaks: Array.isArray(cfg.breaks) && cfg.breaks.length > 0
              ? cfg.breaks.map((b: any, idx: number) => ({
                  id: b.id || `break-${idx + 1}`,
                  afterPeriods: Math.max(1, Number(b.afterPeriods || idx + 1)),
                  durationMinutes: Math.max(5, Number(b.durationMinutes || 20)),
                  label: b.label || `Break ${idx + 1}`
                }))
              : defaultForm.breaks,
            customEntries: Array.isArray(cfg.customEntries)
              ? cfg.customEntries.map((c: any) => ({
                  id: c.id || makeId(),
                  name: c.name || 'Custom event',
                  type: (c.type || 'CUSTOM') as TimetableCustomType,
                  startTime: c.startTime || '09:00',
                  endTime: c.endTime || '09:30'
                }))
              : []
          };

          // Self-heal
          if (missing.length > 0) {
            await supabase
              .from('templates')
              .update({
                config: { ...(cfg || {}), ...loadedForm },
                updated_by: user?.id || null
              })
              .eq('id', templateId)
              .eq('school_id', user.school_id);
            setTemplateMissingFields([]);
          }

          setTimetableForm(loadedForm);
          setEditTimetableForm(loadedForm);
        }

        if (templateRes.data.key === 'ACADEMIC_CALENDAR_SETUP') {
          const loadedCalendar = parseCalendarConfig(templateRes.data.config || {});
          const termsForCalendarYear = (termsRes.data || []).filter((term: any) => Number(term.year) === loadedCalendar.year) as DbTermRow[];
          const hydratedCalendar = await hydrateCalendarFromDbTables(loadedCalendar, termsForCalendarYear);
          setCalendarForm(hydratedCalendar);
          setEditCalendarForm(hydratedCalendar);
        }

        const { data: revisionRows } = await supabase
          .from('template_revisions')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('key', templateRes.data.key)
          .order('changed_at', { ascending: false })
          .limit(10);
        setRevisions((revisionRows || []) as TemplateRevisionRow[]);
      }

      setPermissions((permissionRes.data || []) as PermissionRow[]);
    } catch (err) {
      console.error('Failed to load template', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate();
  }, [templateId, user?.id, user?.school_id]);

  useEffect(() => {
    if (!templateId || !user?.school_id) return;

    const channel = supabase
      .channel(`template-calendar-live-${templateId}-${user.school_id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'templates',
        filter: `id=eq.${templateId}`
      }, () => {
        loadTemplate();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'terms',
        filter: `school_id=eq.${user.school_id}`
      }, () => {
        loadTemplate();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'school_calendar_events',
        filter: `school_id=eq.${user.school_id}`
      }, () => {
        loadTemplate();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'term_holidays',
        filter: `school_id=eq.${user.school_id}`
      }, () => {
        loadTemplate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [templateId, user?.school_id]);

  const timetablePermission = useMemo(
    () => permissions.find((row) => row.template_key === template?.key && row.role === currentRole),
    [permissions, template?.key, currentRole]
  );

  const canEditTemplates = Boolean(timetablePermission?.can_edit);

  const activeTerm = useMemo(() => {
    const now = new Date().toISOString().slice(0, 10);
    const inTerm = calendarForm.terms.find((term) => term.startDate && term.endDate && term.startDate <= now && term.endDate >= now);
    return inTerm || calendarForm.terms[0] || null;
  }, [calendarForm.terms]);

  const normalizedDbTerms = useMemo(() => {
    const withMeta = dbTerms.map((term) => {
      const match = String(term.name || '').match(/term\s*(\d+)/i);
      const termNo = match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
      return { ...term, termNo };
    });

    return withMeta.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.termNo !== b.termNo) return a.termNo - b.termNo;
      return String(a.name).localeCompare(String(b.name));
    });
  }, [dbTerms]);

  const currentYearDbTerms = useMemo(() => {
    const exactYear = normalizedDbTerms.filter((term) => Number(term.year) === Number(calendarForm.year));
    return exactYear.length > 0 ? exactYear : normalizedDbTerms;
  }, [normalizedDbTerms, calendarForm.year]);

  const displayedTerms = useMemo(() => {
    if (currentYearDbTerms.length > 0) {
      return currentYearDbTerms.map((term) => ({
        id: term.id,
        termNumber: parseTermNumberFromName(term.name) || 1,
        label: dbTermLabel(term),
        startDate: term.start_date || '',
        endDate: term.end_date || ''
      }));
    }

    return calendarForm.terms.map((term) => ({
      id: `template-term-${term.termNumber}`,
      termNumber: term.termNumber,
      label: `Term ${term.termNumber} ${calendarForm.year}`,
      startDate: term.startDate || '',
      endDate: term.endDate || ''
    }));
  }, [currentYearDbTerms, calendarForm]);

  const currentDbTerm = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const active = displayedTerms.find((term) => term.startDate && term.endDate && term.startDate <= today && term.endDate >= today);
    if (active) return active;
    if (displayedTerms.length === 0) return null;
    return displayedTerms[displayedTerms.length - 1];
  }, [displayedTerms]);

  const currentActiveTerm = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return displayedTerms.find((term) => term.startDate && term.endDate && term.startDate <= today && term.endDate >= today) || null;
  }, [displayedTerms]);

  const currentTermProgress = useMemo(() => {
    if (!currentActiveTerm?.startDate || !currentActiveTerm?.endDate || !isValidDate(currentActiveTerm.startDate) || !isValidDate(currentActiveTerm.endDate)) {
      return null;
    }

    const start = new Date(currentActiveTerm.startDate);
    const end = new Date(currentActiveTerm.endDate);
    const today = new Date();

    const startMs = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const endMs = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    if (endMs < startMs) return null;

    const oneDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.floor((endMs - startMs) / oneDay) + 1;
    const elapsedDays = Math.max(0, Math.min(totalDays, Math.floor((todayMs - startMs) / oneDay) + 1));
    const daysRemaining = Math.max(0, totalDays - elapsedDays);
    const progress = Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100)));

    return { totalDays, elapsedDays, daysRemaining, progress };
  }, [currentActiveTerm]);

  const hasConfiguredHoliday = useMemo(
    () => calendarForm.holidays.some((holiday) => holiday.startDate && holiday.endDate),
    [calendarForm.holidays]
  );

  const hasConfiguredEvent = useMemo(
    () => calendarForm.events.some((event) => Boolean(event.title?.trim() && event.startDate && event.endDate)),
    [calendarForm.events]
  );

  const calendarCompleteness = useMemo(() => {
    const termFields = calendarForm.terms.length * 3;
    const termsComplete = calendarForm.terms.reduce((acc, term) => {
      let score = acc;
      if (term.name.trim()) score += 1;
      if (isValidDate(term.startDate)) score += 1;
      if (isValidDate(term.endDate)) score += 1;
      return score;
    }, 0);

    const holidayFields = calendarForm.holidays.length * 2;
    const holidaysComplete = calendarForm.holidays.reduce((acc, holiday) => {
      let score = acc;
      if (isValidDate(holiday.startDate)) score += 1;
      if (isValidDate(holiday.endDate)) score += 1;
      return score;
    }, 0);

    const eventsComplete = calendarForm.events.reduce((acc, event) => {
      let score = acc;
      if (event.title.trim()) score += 1;
      if (isValidDate(event.startDate)) score += 1;
      if (isValidDate(event.endDate)) score += 1;
      return score;
    }, 0);

    const total = termFields + holidayFields + 3;
    const completed = termsComplete + holidaysComplete + eventsComplete;
    const ratio = total > 0 ? completed / total : 0;
    return {
      total,
      completed,
      percent: Math.round(ratio * 100)
    };
  }, [calendarForm]);

  const calendarQualityIssues = useMemo(() => {
    const issues: string[] = [];

    calendarForm.terms.forEach((term) => {
      if (term.startDate && term.endDate && term.startDate > term.endDate) {
        issues.push(`${term.name}: start date is after end date.`);
      }
    });

    for (let i = 1; i < calendarForm.terms.length; i += 1) {
      const prev = calendarForm.terms[i - 1];
      const next = calendarForm.terms[i];
      if (prev.endDate && next.startDate && prev.endDate >= next.startDate) {
        issues.push(`${prev.name} overlaps ${next.name}.`);
      }
    }

    calendarForm.holidays.forEach((holiday) => {
      if (holiday.startDate && holiday.endDate && holiday.startDate > holiday.endDate) {
        const label = holiday.kind === 'END_TERM' ? 'End of Term Holiday' : 'Mid Term Holiday';
        issues.push(`${label}: start date is after end date.`);
      }
    });

    calendarForm.events.forEach((event) => {
      if (event.startDate && event.endDate && event.startDate > event.endDate) {
        issues.push(`${event.title || 'Event'}: start date is after end date.`);
      }
    });

    return issues;
  }, [calendarForm]);

  const downloadCalendarIcs = () => {
    const rows: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//School Results System//Academic Calendar//EN',
      'CALSCALE:GREGORIAN',
      `X-WR-CALNAME:${escapeIcsText(`Academic Calendar ${calendarForm.year}`)}`,
      `X-WR-TIMEZONE:${escapeIcsText(calendarForm.timezone || machineTz)}`
    ];

    const addEvent = (uid: string, title: string, startDate: string, endDate: string, description: string) => {
      const start = normalizeDate(startDate);
      const end = normalizeDate(endDate);
      if (!start || !end) return;

      const dtStart = start.replace(/-/g, '');
      const inclusiveEnd = new Date(end);
      inclusiveEnd.setDate(inclusiveEnd.getDate() + 1);
      const dtEnd = inclusiveEnd.toISOString().slice(0, 10).replace(/-/g, '');
      const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      rows.push(
        'BEGIN:VEVENT',
        `UID:${escapeIcsText(uid)}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:${escapeIcsText(title)}`,
        `DESCRIPTION:${escapeIcsText(description)}`,
        'END:VEVENT'
      );
    };

    calendarForm.terms.forEach((term) => {
      addEvent(
        `${template?.id || 'calendar'}-term-${term.termNumber}@school-results`,
        term.name || `Term ${term.termNumber}`,
        term.startDate,
        term.endDate,
        `Academic term ${term.termNumber} for ${calendarForm.year}`
      );
    });

    calendarForm.holidays.forEach((holiday, idx) => {
      const title = holiday.kind === 'END_TERM' ? 'End of Term Holiday' : 'Mid Term Holiday';
      addEvent(
        `${template?.id || 'calendar'}-holiday-${idx + 1}@school-results`,
        title,
        holiday.startDate,
        holiday.endDate,
        `${title} for ${termLabel(holiday.termNumber, calendarForm.year)}`
      );
    });

    calendarForm.events.forEach((customEvent) => {
      if (customEvent?.title?.trim()) {
        addEvent(
          `${template?.id || 'calendar'}-event-${customEvent.id}@school-results`,
          customEvent.title,
          customEvent.startDate,
          customEvent.endDate,
          `Custom academic event (${customEvent.eventType || 'CUSTOM'})`
        );
      }
    });

    rows.push('END:VCALENDAR');

    const blob = new Blob([rows.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `academic-calendar-${calendarForm.year}.ics`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const termLabel = (termNo: number, year: number) => `Term ${termNo} - ${year}`;

  const rerunCalendarTemplate = async () => {
    await loadTemplate();
    alert('Template re-run complete. Latest term data loaded.');
  };

  const deleteCalendarTemplate = async () => {
    setShowTemplateControlAlert(true);
  };

  const syncHolidayEntries = (events: AcademicEvent[], existingHolidays: AcademicHoliday[]) => {
    const manualHolidays = existingHolidays.filter((holiday) => !holiday.sourceEventId);
    const syncedEventHolidays = events
      .filter((event) => event.eventType === 'HOLIDAY' && event.title.trim())
      .map((event) => ({
        id: `holiday-${event.id}`,
        kind: event.termNumber === 2 ? 'MID_TERM' : 'END_TERM',
        termNumber: event.termNumber,
        startDate: event.startDate,
        endDate: event.endDate,
        notes: event.title,
        title: event.title,
        sourceEventId: event.id
      })) as AcademicHoliday[];

    return [...manualHolidays, ...syncedEventHolidays];
  };

  const sortCalendarEvents = (events: AcademicEvent[]) => [...events].sort((a, b) => {
    const aTerm = Number(a.termNumber || 0);
    const bTerm = Number(b.termNumber || 0);
    if (aTerm !== bTerm) return aTerm - bTerm;
    if (a.startDate !== b.startDate) return String(a.startDate).localeCompare(String(b.startDate));
    if (a.startTime !== b.startTime) return String(a.startTime).localeCompare(String(b.startTime));
    return String(a.title).localeCompare(String(b.title));
  });

  const startManagingTerm = (term: { id: string; termNumber: number; label: string; startDate: string; endDate: string }) => {
    setExpandedTermCardId(term.id);
    setActiveTermCardId(term.id);
    setTermEditorOpen(false);
    setEventEditorOpen(false);
    setManagedEventId(null);
    setShowStopClassAlert(false);
    setTermManageDraft({
      termId: term.id,
      termNumber: term.termNumber,
      name: term.label,
      startDate: term.startDate || '',
      endDate: term.endDate || ''
    });
    setTermEventDraft({
      termId: term.id,
      termNumber: term.termNumber,
      title: '',
      eventType: 'HOLIDAY',
      startDate: '',
      startTime: '09:00',
      endDate: '',
      endTime: '10:00',
      stopAllClasses: false,
      status: 'DRAFT'
    });
  };

  const openTermEditor = () => {
    if (!currentManagedTerm) return;
    setEventEditorOpen(false);
    setManagedEventId(null);
    setShowStopClassAlert(false);
    setTermManageDraft((prev) => ({
      ...prev,
      termId: currentManagedTerm.id,
      termNumber: currentManagedTerm.termNumber,
      name: currentManagedTerm.label,
      startDate: currentManagedTerm.startDate,
      endDate: currentManagedTerm.endDate
    }));
    setTermEditorOpen(true);
  };

  const saveManagedTerm = async () => {
    if (!termManageDraft.name.trim() || !termManageDraft.startDate || !termManageDraft.endDate) {
      alert('Please fill Term name, Start Date and End Date.');
      return;
    }

    const nextTerms = calendarForm.terms.map((term) => (
      term.termNumber === termManageDraft.termNumber
        ? {
            ...term,
            name: termManageDraft.name.trim(),
            startDate: termManageDraft.startDate,
            endDate: termManageDraft.endDate
          }
        : term
    ));

    const nextCalendar = {
      ...calendarForm,
      terms: nextTerms,
      holidays: syncHolidayEntries(calendarForm.events, calendarForm.holidays),
      events: sortCalendarEvents(calendarForm.events)
    };

    setCalendarForm(nextCalendar);
    setEditCalendarForm(nextCalendar);
    setTermEditorOpen(false);

    if (canEditTemplates && template && user?.school_id) {
      setSaving(true);
      try {
        await persistCalendarData(nextCalendar, (template.config?.releaseState === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'));

        await loadTemplate();
      } catch (err) {
        console.error('Failed to save term changes', err);
        alert('Failed to save term changes. Please try again.');
        return;
      } finally {
        setSaving(false);
      }
    }

    alert('Term updated successfully.');
  };

  const openCreateEventForTerm = (term: { id: string; termNumber: number }) => {
    setManagedEventId(null);
    setTermEditorOpen(false);
    setEventEditorOpen(true);
    setShowStopClassAlert(false);
    setTermEventDraft({
      termId: term.id,
      termNumber: term.termNumber,
      title: '',
      eventType: 'HOLIDAY',
      startDate: '',
      startTime: '09:00',
      endDate: '',
      endTime: '10:00',
      stopAllClasses: false,
      status: 'DRAFT'
    });
  };

  const editManagedEvent = (event: AcademicEvent) => {
    const matchingTerm = displayedTerms.find((term) => term.termNumber === event.termNumber) || null;
    if (matchingTerm) {
      setExpandedTermCardId(matchingTerm.id);
      setActiveTermCardId(matchingTerm.id);
    }
    setManagedEventId(event.id);
    setTermEditorOpen(false);
    setEventEditorOpen(true);
    setShowStopClassAlert(Boolean(event.stopAllClasses));
    setTermEventDraft({
      termId: `template-term-${event.termNumber}`,
      termNumber: event.termNumber,
      title: event.title,
      eventType: event.eventType === 'HOLIDAY' ? 'HOLIDAY' : event.eventType === 'ASSEMBLY' ? 'ASSEMBLY' : 'SCHOOL_DAY',
      startDate: event.startDate,
      startTime: event.startTime || '09:00',
      endDate: event.endDate,
      endTime: event.endTime || '10:00',
      stopAllClasses: Boolean(event.stopAllClasses),
      status: event.status
    });
  };

  const saveManagedEvent = async (publish: boolean) => {
    if (!termEventDraft.title.trim() || !termEventDraft.startDate || !termEventDraft.endDate || !termEventDraft.startTime || !termEventDraft.endTime) {
      alert('Please fill Event Name, Event type, Start date/time and End date/time.');
      return;
    }

    if (termEventDraft.stopAllClasses) {
      alert(`All classes will be unavailable on the selected dates for ${termEventDraft.title}. All timetables and class sessions will be inaccessible.`);
    }

    const nextEvent: AcademicEvent = {
      id: managedEventId || makeId(),
      termNumber: termEventDraft.termNumber,
      title: termEventDraft.title.trim(),
      startDate: termEventDraft.startDate,
      startTime: termEventDraft.startTime,
      endDate: termEventDraft.endDate,
      endTime: termEventDraft.endTime,
      eventType: termEventDraft.eventType,
      stopAllClasses: termEventDraft.stopAllClasses,
      status: publish ? 'PUBLISHED' : 'DRAFT'
    };

    const nextEvents = sortCalendarEvents([
      ...calendarForm.events.filter((event) => event.id !== nextEvent.id),
      nextEvent
    ]);

    const nextCalendar = {
      ...calendarForm,
      holidays: syncHolidayEntries(nextEvents, calendarForm.holidays),
      events: nextEvents
    };

    setCalendarForm(nextCalendar);
    setEditCalendarForm(nextCalendar);
    setEventEditorOpen(false);
    setManagedEventId(null);
    setShowStopClassAlert(false);

    if (canEditTemplates && template && user?.school_id) {
      setSaving(true);
      try {
        await persistCalendarData(nextCalendar, (template.config?.releaseState === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'));

        await loadTemplate();
      } catch (err) {
        console.error('Failed to save event', err);
        alert('Failed to save event. Please try again.');
        return;
      } finally {
        setSaving(false);
      }
    }

    alert(publish ? 'Event saved.' : 'Event saved as draft.');
  };

  const recordedSpecialItems = useMemo(() => {
    const breakItems = buildBreakTimeline(timetableForm);
    return [...breakItems, ...timetableForm.customEntries];
  }, [timetableForm]);

  const saveTimetableTemplate = async (publish: boolean) => {
    if (!canEditTemplates || !template) return;

    if (publish) {
      const agreed = window.confirm('Your timetable will be changed to match the new template. Proceed?');
      if (!agreed) return;
    }

    setSaving(true);
    try {
      const breaks = [...editTimetableForm.breaks]
        .filter((item) => item.afterPeriods > 0 && item.durationMinutes > 0)
        .sort((a, b) => a.afterPeriods - b.afterPeriods)
        .map((item) => ({
          id: item.id,
          afterPeriods: item.afterPeriods,
          durationMinutes: item.durationMinutes,
          label: item.label || 'Break'
        }));

      const config = {
        schoolStartTime: editTimetableForm.schoolStartTime,
        classStartTime: editTimetableForm.classStartTime,
        classEndTime: editTimetableForm.classEndTime,
        schoolEndTime: editTimetableForm.schoolEndTime,
        periodMinutes: editTimetableForm.periodMinutes,
        defaultClassLabel: editTimetableForm.defaultClassLabel,
        roomPrefix: editTimetableForm.roomPrefix,
        enforceLiveSlotAlignment: editTimetableForm.enforceLiveSlotAlignment,
        subjectSelectionLimit: editTimetableForm.subjectSelectionLimit,
        fallbackStreamCount: editTimetableForm.fallbackStreamCount,
        preferClassTeacherStreams: editTimetableForm.preferClassTeacherStreams,
        dayOrder: editTimetableForm.dayOrder,
        breaks,
        customEntries: editTimetableForm.customEntries,
        releaseState: publish ? 'PUBLISHED' : 'DRAFT'
      };

      await supabase
        .from('templates')
        .update({
          config,
          active: true,
          updated_by: user?.id || null
        })
        .eq('id', template.id)
        .eq('school_id', user?.school_id || '');

      setTimetableForm(editTimetableForm);
      setIsEditingTimetable(false);
      alert(publish ? 'Template published successfully.' : 'Template saved as draft.');
      await loadTemplate();
      
      // Force reload Timetable if it's open - notify via event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('templateUpdated', { detail: { templateKey: 'TIMETABLE_CLASSES' } }));
      }
    } catch (err) {
      console.error('Failed to save template', err);
    } finally {
      setSaving(false);
    }
  };

  const saveCalendarTemplate = async (publish: boolean) => {
    if (!canEditTemplates || !template || !user?.school_id) return;

    setSaving(true);
    try {
      await persistCalendarData(editCalendarForm, publish ? 'PUBLISHED' : 'DRAFT');

      setCalendarForm(editCalendarForm);
      setIsEditingCalendar(false);
      alert(publish ? 'Calendar template published.' : 'Calendar template saved as draft.');
      await loadTemplate();
    } catch (err) {
      console.error('Failed to save calendar template', err);
      alert('Failed to save calendar template. Please review the data and try again.');
    } finally {
      setSaving(false);
    }
  };

  const currentManagedTerm = useMemo(
    () => displayedTerms.find((term) => term.id === expandedTermCardId) || null,
    [displayedTerms, expandedTermCardId]
  );

  const eventsForManagedTerm = useMemo(
    () => calendarForm.events.filter((event) => event.termNumber === (currentManagedTerm?.termNumber || termManageDraft.termNumber)),
    [calendarForm.events, currentManagedTerm?.termNumber, termManageDraft.termNumber]
  );

  const setCalendarYearToCurrent = () => {
    setEditCalendarForm((prev) => ({
      ...prev,
      year: currentYear,
      terms: prev.terms.map((term) => ({ ...term, name: `Term ${term.termNumber}` }))
    }));
  };

  const clearCalendarDates = () => {
    setEditCalendarForm((prev) => ({
      ...prev,
      terms: prev.terms.map((term) => ({ ...term, startDate: '', endDate: '' })),
      holidays: prev.holidays.map((holiday) => ({ ...holiday, startDate: '', endDate: '' })),
      events: prev.events.map((event) => ({ ...event, startDate: '', endDate: '' }))
    }));
  };

  const addCustomEntry = () => {
    if (!newCustom.name.trim()) {
      alert('Please enter an event name');
      return;
    }
    if (!newCustom.startTime || !newCustom.endTime) {
      alert('Please enter start and end times');
      return;
    }
    setEditTimetableForm((prev) => ({
      ...prev,
      customEntries: [
        ...prev.customEntries,
        {
          id: makeId(),
          name: newCustom.name.trim(),
          type: newCustom.type,
          startTime: newCustom.startTime,
          endTime: newCustom.endTime
        }
      ]
    }));
    setNewCustom({ name: '', type: 'CUSTOM', startTime: '09:00', endTime: '09:30' });
    console.log('Custom entry added');
  };

  const removeCustomEntry = (id: string) => {
    setEditTimetableForm((prev) => ({
      ...prev,
      customEntries: prev.customEntries.filter((item) => item.id !== id)
    }));
  };

  const addBreakRow = () => {
    setEditTimetableForm((prev) => ({
      ...prev,
      breaks: [
        ...prev.breaks,
        {
          ...newBreak,
          id: makeId(),
          afterPeriods: Math.max(1, Number(newBreak.afterPeriods || 1)),
          durationMinutes: Math.max(5, Number(newBreak.durationMinutes || 20)),
          label: newBreak.label.trim() || 'Break'
        }
      ]
    }));
    setNewBreak({ id: makeId(), afterPeriods: 2, durationMinutes: 20, label: 'Break' });
  };

  const removeBreakRow = (id: string) => {
    setEditTimetableForm((prev) => ({
      ...prev,
      breaks: prev.breaks.filter((item) => item.id !== id)
    }));
  };

  const restoreFromRevision = async (revisionId: string) => {
    if (!canEditTemplates || !template) return;
    const revision = revisions.find((r) => r.id === revisionId);
    if (!revision) return;

    const agreed = window.confirm('Restore this revision as the current template setting it to DRAFT mode?');
    if (!agreed) return;

    setSaving(true);
    try {
      await supabase
        .from('templates')
        .update({
          config: {
            ...(revision.config || {}),
            releaseState: 'DRAFT'
          },
          updated_by: user?.id || null,
          active: true
        })
        .eq('id', template.id)
        .eq('school_id', user?.school_id || '');

      await loadTemplate();
    } catch (err) {
      console.error('Failed restoring revision', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-zinc-500">Loading template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
        <p className="text-sm text-zinc-600">Template not found</p>
        <Button onClick={() => navigate('/templates')} className="mt-4">Back to templates</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {template.key === 'ACADEMIC_CALENDAR_SETUP' ? (
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/50 dark:border-zinc-700/70 bg-white/65 dark:bg-zinc-900/50 backdrop-blur-xl shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] px-4 md:px-6 py-4"
          style={{ fontFamily: 'Inter' }}
        >
          <h1 className="text-xl md:text-[1.55rem] font-semibold tracking-tight text-zinc-900 dark:text-white" style={{ fontFamily: 'Sora' }}>Set up your school calendar year</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button className="rounded-full px-4 bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm" onClick={() => { setEditCalendarForm(calendarForm); setIsEditingCalendar(true); }}>Edit Template</Button>
            <Button variant="outline" className="rounded-full px-4 border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 shadow-sm" onClick={rerunCalendarTemplate} disabled={saving}>Re-run template</Button>
            <Button variant="outline" className="rounded-full px-4 border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/70 shadow-sm" onClick={downloadCalendarIcs}><Download className="w-4 h-4" /> Export</Button>
            <Button variant="outline" className="rounded-full px-3 border-red-200 text-red-700 dark:text-red-300 dark:border-red-900/60 bg-white/85 dark:bg-zinc-900/70 shadow-sm" onClick={deleteCalendarTemplate}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <button
            onClick={() => navigate('/templates')}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{template.name}</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{template.key}</p>
          </div>
          <Badge variant={template.config?.releaseState === 'PUBLISHED' ? 'success' : 'warning'}>
            {template.config?.releaseState === 'PUBLISHED' ? 'Published' : 'Draft'}
          </Badge>
        </div>
      )}

      {/* Main Content */}
      {template.key === 'TIMETABLE_CLASSES' ? (
        <div className="space-y-4">
          {/* Missing Fields Warning */}
          {templateMissingFields.length > 0 && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-300">Some fields are using fallback values</p>
                  <p className="text-xs text-amber-800 dark:text-amber-400 mt-1">Missing: {templateMissingFields.join(', ')}</p>
                </div>
              </div>
            </div>
          )}

          {/* View Mode */}
          {!isEditingTimetable ? (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="space-y-6">
                {/* Timing Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">School starts</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">{timetableForm.schoolStartTime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">School ends</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">{timetableForm.schoolEndTime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Classes start</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">{timetableForm.classStartTime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Classes end</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">{timetableForm.classEndTime}</p>
                  </div>
                </div>

                {/* Configuration */}
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Configuration</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Period duration</p>
                      <p className="font-medium text-zinc-900 dark:text-white">{timetableForm.periodMinutes} minutes</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Default class label</p>
                      <p className="font-medium text-zinc-900 dark:text-white">{timetableForm.defaultClassLabel}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Room prefix</p>
                      <p className="font-medium text-zinc-900 dark:text-white">{timetableForm.roomPrefix}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Subject limit</p>
                      <p className="font-medium text-zinc-900 dark:text-white">{timetableForm.subjectSelectionLimit}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Fallback streams</p>
                      <p className="font-medium text-zinc-900 dark:text-white">{timetableForm.fallbackStreamCount}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Days per week</p>
                      <p className="font-medium text-zinc-900 dark:text-white">{timetableForm.dayOrder.length}</p>
                    </div>
                  </div>
                </div>

                {/* More Info */}
                {recordedSpecialItems.length > 0 && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Schedule Items</h3>
                    <div className="space-y-2">
                      {recordedSpecialItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-start rounded-lg bg-zinc-50 dark:bg-zinc-900/50 p-3 text-sm"
                        >
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-white">{item.name}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.startTime} - {item.endTime}</p>
                          </div>
                          <Badge variant="info">{item.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit Button */}
                {canEditTemplates && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 flex justify-end">
                    <Button
                      onClick={() => {
                        setEditTimetableForm(timetableForm);
                        setIsEditingTimetable(true);
                        setTimetableTab('SETTINGS');
                      }}
                    >
                      Edit template
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
              {/* Tab Selection */}
              <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={() => setTimetableTab('SETTINGS')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    timetableTab === 'SETTINGS'
                      ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                      : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Timing & Settings
                </button>
                <button
                  onClick={() => setTimetableTab('CUSTOM')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    timetableTab === 'CUSTOM'
                      ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                      : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Schedule Items
                </button>
              </div>

              {/* Settings Tab */}
              {timetableTab === 'SETTINGS' && (
                <div className="space-y-6">
                  {/* Timing Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">School Hours</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">School starts at</label>
                        <input
                          type="time"
                          value={editTimetableForm.schoolStartTime}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, schoolStartTime: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">School ends at</label>
                        <input
                          type="time"
                          value={editTimetableForm.schoolEndTime}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, schoolEndTime: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Classes start at</label>
                        <input
                          type="time"
                          value={editTimetableForm.classStartTime}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, classStartTime: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Classes end at</label>
                        <input
                          type="time"
                          value={editTimetableForm.classEndTime}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, classEndTime: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Generation Settings */}
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Generation Defaults</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Minutes per period</label>
                        <input
                          type="number"
                          min={20}
                          max={120}
                          value={editTimetableForm.periodMinutes}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, periodMinutes: Math.max(20, Number(e.target.value) || 45) }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Default class label</label>
                        <input
                          type="text"
                          value={editTimetableForm.defaultClassLabel}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, defaultClassLabel: e.target.value || 'Class' }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Room prefix</label>
                        <input
                          type="text"
                          value={editTimetableForm.roomPrefix}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, roomPrefix: e.target.value || 'Room' }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Subject selection limit</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={editTimetableForm.subjectSelectionLimit}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, subjectSelectionLimit: Math.max(1, Number(e.target.value) || 1) }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Fallback stream count</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={editTimetableForm.fallbackStreamCount}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, fallbackStreamCount: Math.max(1, Number(e.target.value) || 1) }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editTimetableForm.enforceLiveSlotAlignment}
                        onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, enforceLiveSlotAlignment: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Enforce live sessions to match template slots</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editTimetableForm.preferClassTeacherStreams}
                        onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, preferClassTeacherStreams: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Prefer class-teacher assigned streams</span>
                    </label>
                  </div>

                  {/* Breaks */}
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Breaks</h4>
                    <div className="space-y-3">
                      {editTimetableForm.breaks.map((item) => (
                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                          <input
                            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                            placeholder="Break name"
                            value={item.label}
                            onChange={(e) =>
                              setEditTimetableForm((prev) => ({
                                ...prev,
                                breaks: prev.breaks.map((row) =>
                                  row.id === item.id ? { ...row, label: e.target.value } : row
                                )
                              }))
                            }
                          />
                          <input
                            type="number"
                            min={1}
                            placeholder="After period"
                            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                            value={item.afterPeriods}
                            onChange={(e) =>
                              setEditTimetableForm((prev) => ({
                                ...prev,
                                breaks: prev.breaks.map((row) =>
                                  row.id === item.id
                                    ? { ...row, afterPeriods: Math.max(1, Number(e.target.value) || 1) }
                                    : row
                                )
                              }))
                            }
                          />
                          <input
                            type="number"
                            min={5}
                            placeholder="Duration (min)"
                            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                            value={item.durationMinutes}
                            onChange={(e) =>
                              setEditTimetableForm((prev) => ({
                                ...prev,
                                breaks: prev.breaks.map((row) =>
                                  row.id === item.id
                                    ? { ...row, durationMinutes: Math.max(5, Number(e.target.value) || 5) }
                                    : row
                                )
                              }))
                            }
                          />
                          <Button
                            variant="outline"
                            className="h-10"
                            onClick={() => removeBreakRow(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end border-t border-zinc-200 dark:border-zinc-800 pt-3">
                        <input
                          className="px-3 py-2 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                          placeholder="Break name"
                          value={newBreak.label}
                          onChange={(e) => setNewBreak((prev) => ({ ...prev, label: e.target.value }))}
                        />
                        <input
                          type="number"
                          min={1}
                          placeholder="After period"
                          className="px-3 py-2 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                          value={newBreak.afterPeriods}
                          onChange={(e) => setNewBreak((prev) => ({ ...prev, afterPeriods: Math.max(1, Number(e.target.value) || 1) }))}
                        />
                        <input
                          type="number"
                          min={5}
                          placeholder="Duration (min)"
                          className="px-3 py-2 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                          value={newBreak.durationMinutes}
                          onChange={(e) => setNewBreak((prev) => ({ ...prev, durationMinutes: Math.max(5, Number(e.target.value) || 5) }))}
                        />
                        <Button
                          variant="outline"
                          className="h-10 md:col-span-1"
                          onClick={addBreakRow}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Items Tab */}
              {timetableTab === 'CUSTOM' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <input
                      className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm md:col-span-2"
                      placeholder="Event name"
                      value={newCustom.name}
                      onChange={(e) => setNewCustom((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <select
                      className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                      value={newCustom.type}
                      onChange={(e) => setNewCustom((prev) => ({ ...prev, type: e.target.value as TimetableCustomType }))}
                    >
                      <option value="CLASS">Class</option>
                      <option value="ASSEMBLY">Assembly</option>
                      <option value="EXAMS">Exams</option>
                      <option value="BREAKS_LUNCH">Breaks & Lunch</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                    <input
                      type="time"
                      className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                      value={newCustom.startTime}
                      onChange={(e) => setNewCustom((prev) => ({ ...prev, startTime: e.target.value }))}
                    />
                    <input
                      type="time"
                      className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                      value={newCustom.endTime}
                      onChange={(e) => setNewCustom((prev) => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>

                  <Button onClick={addCustomEntry} disabled={!newCustom.name.trim()}>
                    <Plus className="w-4 h-4" /> Add item
                  </Button>

                  <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                    {editTimetableForm.customEntries.length === 0 ? (
                      <p className="text-xs text-zinc-500">No custom items yet</p>
                    ) : (
                      editTimetableForm.customEntries.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center rounded-lg bg-zinc-50 dark:bg-zinc-900/50 p-3"
                        >
                          <div className="text-sm">
                            <p className="font-medium text-zinc-900 dark:text-white">{item.name}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {item.startTime} - {item.endTime} - {item.type}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            className="h-8 px-2"
                            onClick={() => removeCustomEntry(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Save Actions */}
              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    setEditTimetableForm(timetableForm);
                    setIsEditingTimetable(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => saveTimetableTemplate(false)}
                >
                  Save as draft
                </Button>
                <Button
                  disabled={saving}
                  onClick={() => saveTimetableTemplate(true)}
                >
                  Publish & apply
                </Button>
              </div>
            </div>
          )}

          {/* Revisions */}
          {revisions.length > 0 && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Revision History</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="flex justify-between items-center rounded-lg bg-zinc-50 dark:bg-zinc-900/50 p-3 text-xs"
                  >
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{rev.action}</p>
                      <p className="text-zinc-500 dark:text-zinc-400">
                        {new Date(rev.changed_at).toLocaleString('en-GB')}
                      </p>
                    </div>
                    {canEditTemplates && (
                      <Button variant="outline" className="h-7 text-xs px-2" onClick={() => restoreFromRevision(rev.id)} disabled={saving}>
                        Restore
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : template.key === 'ACADEMIC_CALENDAR_SETUP' ? (
        <div className="space-y-8 rounded-[28px] bg-[#fffcf6] dark:bg-[#fff8ee] p-5 md:p-8" style={{ fontFamily: 'Inter' }}>
          {!isEditingCalendar ? (
            <>
              <div className="rounded-3xl border border-white/80 dark:border-white/70 bg-white/58 dark:bg-white/58 backdrop-blur-2xl shadow-[0_35px_90px_-45px_rgba(0,0,0,0.35)] px-6 md:px-8 py-7 md:py-8">
                <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-zinc-600 dark:text-zinc-600">Current</p>
                <p className="mt-3 text-lg md:text-xl leading-tight font-semibold text-zinc-900 dark:text-zinc-900" style={{ fontFamily: 'Sora' }}>
                  {currentDbTerm ? currentDbTerm.label : 'No current term'}
                </p>

                <div className="mt-4 rounded-2xl border border-white/70 dark:border-white/70 bg-white/55 dark:bg-white/55 backdrop-blur-lg p-3">
                  {currentTermProgress ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-500">Days elapsed: <span className="font-medium text-zinc-900 dark:text-zinc-900">{currentTermProgress.elapsedDays}</span></p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-500">Days remaining: <span className="font-medium text-zinc-900 dark:text-zinc-900">{currentTermProgress.daysRemaining}</span></p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-500">Progress: <span className="font-medium text-zinc-900 dark:text-zinc-900">{currentTermProgress.progress}%</span></p>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-zinc-200/80 overflow-hidden">
                        <div className="h-full rounded-full bg-zinc-800" style={{ width: `${currentTermProgress.progress}%` }} />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-zinc-600 dark:text-zinc-600">No active term progress data available.</p>
                  )}
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/70 dark:border-white/70 bg-white/55 dark:bg-white/55 backdrop-blur-lg p-3">
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Started on</p>
                    <p className="mt-1 text-xs font-medium text-zinc-900 dark:text-zinc-900">{currentDbTerm?.startDate ? formatDate(currentDbTerm.startDate) : 'No start date set'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 dark:border-white/70 bg-white/55 dark:bg-white/55 backdrop-blur-lg p-3">
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-500 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Ends on</p>
                    <p className="mt-1 text-xs font-medium text-zinc-900 dark:text-zinc-900">{currentDbTerm?.endDate ? formatDate(currentDbTerm.endDate) : 'No end date set'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 dark:border-white/70 bg-white/55 dark:bg-white/55 backdrop-blur-lg p-3">
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-500 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Timezone</p>
                    <p className="mt-1 text-xs font-medium text-zinc-900 dark:text-zinc-900">{machineTz}</p>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white" style={{ fontFamily: 'Sora' }}>Terms Management</h2>
                <div className="mt-4 space-y-3">
                  {displayedTerms.length === 0 ? (
                    <p className="py-4 text-sm text-zinc-500 dark:text-zinc-400">No terms available.</p>
                  ) : (
                    displayedTerms.map((term) => (
                      <div
                        key={term.id}
                        className={`rounded-2xl border backdrop-blur-xl shadow-[0_20px_45px_-35px_rgba(0,0,0,0.30)] transition-all ${
                          activeTermCardId === term.id
                            ? 'border-zinc-300/60 dark:border-zinc-300/60 bg-white/70 dark:bg-white/70'
                            : 'border-white/80 dark:border-white/80 bg-white/58 dark:bg-white/58'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setActiveTermCardId(term.id)}
                            className="text-left flex-1 min-w-[220px]"
                          >
                            <p className="text-[14px] font-medium text-zinc-900 dark:text-zinc-900 flex items-center gap-2">
                              {activeTermCardId === term.id ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <CircleDashed className="w-4 h-4 text-zinc-500" />}
                              {term.label}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                              {term.startDate && term.endDate ? `${formatDate(term.startDate)} to ${formatDate(term.endDate)}` : 'No term dates set yet'}
                            </p>
                          </button>

                          <Button
                            variant="outline"
                            className="rounded-full px-4 border-zinc-300/90 dark:border-zinc-300 bg-white/75 dark:bg-white/75"
                            onClick={() => startManagingTerm(term)}
                          >
                            Manage term
                          </Button>
                        </div>

                        {expandedTermCardId === term.id && (
                          <div className="border-t border-zinc-200/80 dark:border-zinc-300/80 px-4 md:px-5 py-4 md:py-5 bg-white/52 dark:bg-white/52 rounded-b-2xl space-y-4">
                            <div className="grid gap-3 md:grid-cols-3 text-xs text-zinc-700 dark:text-zinc-700">
                              <div className="rounded-xl border border-white/80 bg-white/75 p-3">
                                <p className="text-[11px] text-zinc-500">Start date</p>
                                <p className="mt-1 font-medium text-zinc-900">{term.startDate ? formatDate(term.startDate) : 'No start date set'}</p>
                              </div>
                              <div className="rounded-xl border border-white/80 bg-white/75 p-3">
                                <p className="text-[11px] text-zinc-500">End date</p>
                                <p className="mt-1 font-medium text-zinc-900">{term.endDate ? formatDate(term.endDate) : 'No end date set'}</p>
                              </div>
                              <div className="rounded-xl border border-white/80 bg-white/75 p-3">
                                <p className="text-[11px] text-zinc-500">Duration</p>
                                <p className="mt-1 font-medium text-zinc-900">{term.startDate && term.endDate ? formatDurationLabel(term.startDate, term.endDate) : 'No duration yet'}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Button variant="outline" className="rounded-full" onClick={() => setExpandedTermCardId(null)}>Close</Button>
                              <Button variant="outline" className="rounded-full" onClick={openTermEditor} disabled={!canEditTemplates}>
                                <PencilLine className="w-4 h-4" /> Edit
                              </Button>
                              <Button className="rounded-full" onClick={() => openCreateEventForTerm(term)} disabled={!canEditTemplates}>
                                <CalendarPlus className="w-4 h-4" /> Create event
                              </Button>
                            </div>

                            {termEditorOpen && currentManagedTerm?.id === term.id && (
                              <div className="rounded-2xl border border-zinc-200/80 bg-white/82 p-4 space-y-4">
                                <p className="text-xs font-semibold text-zinc-900" style={{ fontFamily: 'Sora' }}>Edit term</p>
                                <div className="grid gap-3 md:grid-cols-3">
                                  <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Term name</label>
                                    <input
                                      type="text"
                                      value={termManageDraft.name}
                                      onChange={(e) => setTermManageDraft((prev) => ({ ...prev, name: e.target.value }))}
                                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Start Date</label>
                                    <input
                                      type="date"
                                      value={termManageDraft.startDate}
                                      onChange={(e) => setTermManageDraft((prev) => ({ ...prev, startDate: e.target.value }))}
                                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-zinc-500 mb-1">End Date</label>
                                    <input
                                      type="date"
                                      value={termManageDraft.endDate}
                                      onChange={(e) => setTermManageDraft((prev) => ({ ...prev, endDate: e.target.value }))}
                                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <p className="text-xs font-semibold text-zinc-900 mb-2" style={{ fontFamily: 'Sora' }}>Created events</p>
                                  <div className="space-y-2">
                                    {eventsForManagedTerm.filter((event) => event.termNumber === term.termNumber).length === 0 ? (
                                      <p className="text-xs text-zinc-500">No events created for this term yet.</p>
                                    ) : (
                                      eventsForManagedTerm
                                        .filter((event) => event.termNumber === term.termNumber)
                                        .map((event) => (
                                          <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
                                            <div>
                                              <p className="font-medium text-zinc-900">{event.title}</p>
                                              <p className="text-zinc-500">{event.eventType} • {formatDateTime(event.startDate, event.startTime)} to {formatDateTime(event.endDate, event.endTime)}</p>
                                            </div>
                                            <Button variant="outline" className="h-8 px-3" onClick={() => editManagedEvent(event)}>
                                              <PencilLine className="w-3.5 h-3.5" /> Edit
                                            </Button>
                                          </div>
                                        ))
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="outline" className="rounded-full" onClick={() => setTermEditorOpen(false)}>Cancel</Button>
                                  <Button className="rounded-full" onClick={saveManagedTerm} disabled={saving || !canEditTemplates}>Save term</Button>
                                </div>
                                {!canEditTemplates && (
                                  <p className="text-xs text-amber-700">Editing requires template permissions.</p>
                                )}
                              </div>
                            )}

                            {eventEditorOpen && currentManagedTerm?.id === term.id && (
                              <div className="rounded-2xl border border-zinc-200/80 bg-white/82 p-4 space-y-4">
                                <p className="text-xs font-semibold text-zinc-900" style={{ fontFamily: 'Sora' }}>{managedEventId ? 'Edit event' : 'Create event'}</p>
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                  <div className="xl:col-span-2">
                                    <label className="block text-xs text-zinc-500 mb-1">Event Name</label>
                                    <input
                                      type="text"
                                      value={termEventDraft.title}
                                      onChange={(e) => setTermEventDraft((prev) => ({ ...prev, title: e.target.value }))}
                                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Event type</label>
                                    <select
                                      value={termEventDraft.eventType}
                                      onChange={(e) => {
                                        const nextType = e.target.value as 'HOLIDAY' | 'ASSEMBLY' | 'SCHOOL_DAY';
                                        setTermEventDraft((prev) => ({ ...prev, eventType: nextType }));
                                      }}
                                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                                    >
                                      <option value="HOLIDAY">Holiday</option>
                                      <option value="ASSEMBLY">Assembly</option>
                                      <option value="SCHOOL_DAY">School Day</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Term</label>
                                    <div className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{term.label}</div>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Start date</label>
                                    <input
                                      type="date"
                                      value={termEventDraft.startDate}
                                      onChange={(e) => setTermEventDraft((prev) => ({ ...prev, startDate: e.target.value }))}
                                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Start time</label>
                                    <input
                                      type="time"
                                      value={termEventDraft.startTime}
                                      onChange={(e) => setTermEventDraft((prev) => ({ ...prev, startTime: e.target.value }))}
                                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-zinc-500 mb-1">End date</label>
                                    <input
                                      type="date"
                                      value={termEventDraft.endDate}
                                      onChange={(e) => setTermEventDraft((prev) => ({ ...prev, endDate: e.target.value }))}
                                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-zinc-500 mb-1">End time</label>
                                    <input
                                      type="time"
                                      value={termEventDraft.endTime}
                                      onChange={(e) => setTermEventDraft((prev) => ({ ...prev, endTime: e.target.value }))}
                                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                                    />
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                                  <p className="text-xs font-medium text-zinc-700 mb-2">Stop all classes during the event?</p>
                                  <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <label className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`stop-classes-${term.id}`}
                                        checked={termEventDraft.stopAllClasses}
                                        onChange={() => {
                                          setTermEventDraft((prev) => ({ ...prev, stopAllClasses: true }));
                                          setShowStopClassAlert(true);
                                        }}
                                      />
                                      Yes
                                    </label>
                                    <label className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`stop-classes-${term.id}`}
                                        checked={!termEventDraft.stopAllClasses}
                                        onChange={() => {
                                          setTermEventDraft((prev) => ({ ...prev, stopAllClasses: false }));
                                          setShowStopClassAlert(false);
                                        }}
                                      />
                                      No
                                    </label>
                                  </div>
                                  {showStopClassAlert && termEventDraft.stopAllClasses && (
                                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                      All classes will be unavailable on the selected dates because of {termEventDraft.title || 'this event'}. All timetables and class sessions will be inaccessible.
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="outline" className="rounded-full" onClick={() => { setEventEditorOpen(false); setManagedEventId(null); setShowStopClassAlert(false); }}>Cancel</Button>
                                  <Button variant="outline" className="rounded-full" onClick={() => saveManagedEvent(false)} disabled={saving || !canEditTemplates}>Save draft</Button>
                                  <Button className="rounded-full" onClick={() => saveManagedEvent(true)} disabled={saving || !canEditTemplates}>Save</Button>
                                </div>
                                {!canEditTemplates && (
                                  <p className="text-xs text-amber-700">Editing requires template permissions.</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2">
                <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white" style={{ fontFamily: 'Sora' }}>School holidays & events</h2>
                {!hasConfiguredHoliday && !hasConfiguredEvent && (
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-600">No holiday created yet.</p>
                )}
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {calendarForm.holidays.map((holiday) => {
                    const holidayName = holiday.title || holiday.notes || (holiday.kind === 'END_TERM' ? 'End Term Holiday' : 'Mid Term Holiday');
                    const linkedHolidayEvent = holiday.sourceEventId ? calendarForm.events.find((event) => event.id === holiday.sourceEventId) || null : null;
                    return (
                      <div key={holiday.id} className="rounded-2xl border border-white/80 dark:border-white/80 bg-white/58 dark:bg-white/58 backdrop-blur-xl shadow-[0_20px_45px_-35px_rgba(0,0,0,0.30)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-900 flex items-center gap-2" style={{ fontFamily: 'Sora' }}><CalendarRange className="w-4 h-4 text-zinc-600 dark:text-zinc-600" /> {holidayName}</p>
                          {linkedHolidayEvent && (
                            <Button variant="outline" className="h-8 px-3" onClick={() => editManagedEvent(linkedHolidayEvent)}>
                              <PencilLine className="w-3.5 h-3.5" /> Edit
                            </Button>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{termLabel(holiday.termNumber, calendarForm.year)}</p>
                        <div className="mt-3 space-y-1.5 text-xs text-zinc-700 dark:text-zinc-700">
                          <p><span className="font-medium text-zinc-900 dark:text-zinc-900">Start:</span> {holiday.startDate ? formatDate(holiday.startDate) : 'No start date set'}</p>
                          <p><span className="font-medium text-zinc-900 dark:text-zinc-900">End:</span> {holiday.endDate ? formatDate(holiday.endDate) : 'No end date set'}</p>
                          <p><span className="font-medium text-zinc-900 dark:text-zinc-900">Duration:</span> {holiday.startDate && holiday.endDate ? formatDurationLabel(holiday.startDate, holiday.endDate) : 'No holiday duration yet'}</p>
                        </div>
                      </div>
                    );
                  })}

                  {calendarForm.events.filter((event) => event.eventType !== 'HOLIDAY').map((event) => (
                    <div key={event.id} className="rounded-2xl border border-white/80 dark:border-white/80 bg-white/58 dark:bg-white/58 backdrop-blur-xl shadow-[0_20px_45px_-35px_rgba(0,0,0,0.30)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-900 flex items-center gap-2" style={{ fontFamily: 'Sora' }}><BadgeInfo className="w-4 h-4 text-zinc-600 dark:text-zinc-600" /> {event.title}</p>
                        <Button variant="outline" className="h-8 px-3" onClick={() => editManagedEvent(event)}>
                          <PencilLine className="w-3.5 h-3.5" /> Edit
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{event.eventType} • {event.status}</p>
                      <div className="mt-3 space-y-1.5 text-xs text-zinc-700 dark:text-zinc-700">
                        <p><span className="font-medium text-zinc-900 dark:text-zinc-900">Start:</span> {event.startDate ? formatDateTime(event.startDate, event.startTime) : 'No start date set'}</p>
                        <p><span className="font-medium text-zinc-900 dark:text-zinc-900">End:</span> {event.endDate ? formatDateTime(event.endDate, event.endTime) : 'No end date set'}</p>
                        <p><span className="font-medium text-zinc-900 dark:text-zinc-900">Duration:</span> {event.startDate && event.endDate ? formatDurationLabel(event.startDate, event.endDate) : 'No event duration yet'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6 rounded-3xl border border-white/60 dark:border-zinc-700/70 bg-white/60 dark:bg-zinc-900/55 backdrop-blur-2xl shadow-[0_35px_90px_-45px_rgba(0,0,0,0.55)] p-6 md:p-8">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Academic year</label>
                  <input type="number" value={editCalendarForm.year} onChange={(e) => setEditCalendarForm((prev) => ({ ...prev, year: Number(e.target.value) || currentYear }))} className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/70 text-sm" />
                </div>
                <div className="xl:col-span-3">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Timezone</label>
                  <div className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50/90 dark:bg-zinc-900/70 text-sm text-zinc-700 dark:text-zinc-200">{machineTz}</div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {editCalendarForm.terms.map((term, index) => (
                  <div key={term.termNumber} className="rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-900/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{termLabel(term.termNumber, editCalendarForm.year)}</p>
                    <input type="text" value={term.name} onChange={(e) => setEditCalendarForm((prev) => ({ ...prev, terms: prev.terms.map((row, idx) => idx === index ? { ...row, name: e.target.value || `Term ${row.termNumber}` } : row) }))} className="w-full mt-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm" />
                    <input type="date" value={term.startDate} onChange={(e) => setEditCalendarForm((prev) => ({ ...prev, terms: prev.terms.map((row, idx) => idx === index ? { ...row, startDate: e.target.value } : row) }))} className="w-full mt-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm" />
                    <input type="date" value={term.endDate} onChange={(e) => setEditCalendarForm((prev) => ({ ...prev, terms: prev.terms.map((row, idx) => idx === index ? { ...row, endDate: e.target.value } : row) }))} className="w-full mt-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm" />
                  </div>
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-900/70 p-4">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">End of Term Holiday</p>
                  <select value={editCalendarForm.holidays[0]?.termNumber || 1} onChange={(e) => setEditCalendarForm((prev) => ({ ...prev, holidays: prev.holidays.map((row, idx) => idx === 0 ? { ...row, termNumber: Number(e.target.value) || 1 } : row) }))} className="w-full mt-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm">
                    {editCalendarForm.terms.map((term) => (
                      <option key={`end-holiday-term-${term.termNumber}`} value={term.termNumber}>{termLabel(term.termNumber, editCalendarForm.year)}</option>
                    ))}
                  </select>
                  <input type="date" value={editCalendarForm.holidays[0]?.startDate || ''} onChange={(e) => setEditCalendarForm((prev) => ({ ...prev, holidays: prev.holidays.map((row, idx) => idx === 0 ? { ...row, startDate: e.target.value } : row) }))} className="w-full mt-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm" />
                  <input type="date" value={editCalendarForm.holidays[0]?.endDate || ''} onChange={(e) => setEditCalendarForm((prev) => ({ ...prev, holidays: prev.holidays.map((row, idx) => idx === 0 ? { ...row, endDate: e.target.value } : row) }))} className="w-full mt-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm" />
                </div>

                <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-900/70 p-4">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">Mid Term Holiday</p>
                  <select value={editCalendarForm.holidays[1]?.termNumber || 1} onChange={(e) => setEditCalendarForm((prev) => ({ ...prev, holidays: prev.holidays.map((row, idx) => idx === 1 ? { ...row, termNumber: Number(e.target.value) || 1 } : row) }))} className="w-full mt-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm">
                    {editCalendarForm.terms.map((term) => (
                      <option key={`mid-holiday-term-${term.termNumber}`} value={term.termNumber}>{termLabel(term.termNumber, editCalendarForm.year)}</option>
                    ))}
                  </select>
                  <input type="date" value={editCalendarForm.holidays[1]?.startDate || ''} onChange={(e) => setEditCalendarForm((prev) => ({ ...prev, holidays: prev.holidays.map((row, idx) => idx === 1 ? { ...row, startDate: e.target.value } : row) }))} className="w-full mt-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm" />
                  <input type="date" value={editCalendarForm.holidays[1]?.endDate || ''} onChange={(e) => setEditCalendarForm((prev) => ({ ...prev, holidays: prev.holidays.map((row, idx) => idx === 1 ? { ...row, endDate: e.target.value } : row) }))} className="w-full mt-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm" />
                </div>

                <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-900/70 p-4">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">Custom Event</p>
                  <input type="text" placeholder="Event name" value={editCalendarForm.events[0].title} onChange={(e) => setEditCalendarForm((prev) => ({ ...prev, events: prev.events.map((row, idx) => idx === 0 ? { ...row, title: e.target.value } : row) }))} className="w-full mt-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm" />
                  <input type="date" value={editCalendarForm.events[0].startDate} onChange={(e) => setEditCalendarForm((prev) => ({ ...prev, events: prev.events.map((row, idx) => idx === 0 ? { ...row, startDate: e.target.value } : row) }))} className="w-full mt-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm" />
                  <input type="date" value={editCalendarForm.events[0].endDate} onChange={(e) => setEditCalendarForm((prev) => ({ ...prev, events: prev.events.map((row, idx) => idx === 0 ? { ...row, endDate: e.target.value } : row) }))} className="w-full mt-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm" />
                </div>
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 flex justify-end gap-3">
                <Button variant="outline" disabled={saving} onClick={() => { setEditCalendarForm(calendarForm); setIsEditingCalendar(false); }}>Cancel</Button>
                <Button variant="outline" disabled={saving} onClick={() => saveCalendarTemplate(false)}>Save as draft</Button>
                <Button disabled={saving} onClick={() => saveCalendarTemplate(true)}>Publish & apply</Button>
              </div>
            </div>
          )}

          {showTemplateControlAlert && (
            <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-5 shadow-2xl">
                <p className="text-sm font-semibold text-red-700" style={{ fontFamily: 'Sora' }}>Template action unavailable</p>
                <p className="mt-2 text-sm text-zinc-700">This template is controlled centrally by P3L-APIs and the P3L Developers team, so deletion is blocked from the UI.</p>
                <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800">
                  Need it removed or replaced? Contact support with the template name and school context.
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.location.href = 'mailto:support@p3l.dev?subject=Template%20Support%20Request';
                    }}
                  >
                    Contact Support
                  </Button>
                  <Button onClick={() => setShowTemplateControlAlert(false)}>Exit</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Non-Timetable Templates */
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>This template type does not have editable configuration</p>
        </div>
      )}
    </div>
  );
};
