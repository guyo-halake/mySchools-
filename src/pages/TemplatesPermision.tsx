import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Clock3, Wrench, Sparkles, Plus, Trash2 } from 'lucide-react';
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

const TEMPLATE_ICONS: Record<string, any> = {
  TIMETABLE_CLASSES: Clock3,
  SYSTEM_ACCESS_AUTH: ShieldCheck,
  SYSTEM_UPDATES_MAINTENANCE: Wrench,
  CLASSROOM_START: Sparkles
};

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

export const TemplatesPermision: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingTimetable, setIsEditingTimetable] = useState(false);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [timetableForm, setTimetableForm] = useState<TimetableForm>(defaultForm);
  const [editTimetableForm, setEditTimetableForm] = useState<TimetableForm>(defaultForm);
  const [timetableTab, setTimetableTab] = useState<'SETTINGS' | 'CUSTOM'>('SETTINGS');
  const [templateMissingFields, setTemplateMissingFields] = useState<string[]>([]);
  const [revisions, setRevisions] = useState<TemplateRevisionRow[]>([]);
  const [newCustom, setNewCustom] = useState({
    name: '',
    type: 'CUSTOM' as TimetableCustomType,
    startTime: '09:00',
    endTime: '09:30'
  });
  const [newBreak, setNewBreak] = useState<TimetableBreakRow>({ id: makeId(), afterPeriods: 2, durationMinutes: 20, label: 'Break' });

  const currentRole = String(user?.role || '').toUpperCase();

  const loadTemplates = async () => {
    if (!user?.school_id) return;

    setLoading(true);
    try {
      const [templateRes, permissionRes] = await Promise.all([
        supabase
          .from('templates')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('archived', false)
          .order('name', { ascending: true }),
        supabase
          .from('template_permissions')
          .select('*')
          .eq('school_id', user.school_id)
          .order('template_key', { ascending: true })
      ]);

      const { data: revisionRows } = await supabase
        .from('template_revisions')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('key', 'TIMETABLE_CLASSES')
        .order('changed_at', { ascending: false })
        .limit(10);
      setRevisions((revisionRows || []) as TemplateRevisionRow[]);

      const rows = (templateRes.data || []) as TemplateRow[];
      setTemplates(rows);
      setPermissions((permissionRes.data || []) as PermissionRow[]);

      const timetable = rows.find((row) => row.key === 'TIMETABLE_CLASSES');
      if (timetable?.config) {
        const cfg = timetable.config;
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
          enforceLiveSlotAlignment: typeof cfg.enforceLiveSlotAlignment === 'boolean'
            ? cfg.enforceLiveSlotAlignment
            : defaultForm.enforceLiveSlotAlignment,
          subjectSelectionLimit: Math.max(1, Number(cfg.subjectSelectionLimit || defaultForm.subjectSelectionLimit)),
          fallbackStreamCount: Math.max(1, Number(cfg.fallbackStreamCount || defaultForm.fallbackStreamCount)),
          preferClassTeacherStreams: typeof cfg.preferClassTeacherStreams === 'boolean'
            ? cfg.preferClassTeacherStreams
            : defaultForm.preferClassTeacherStreams,
          dayOrder: Array.isArray(cfg.dayOrder) && cfg.dayOrder.length > 0
            ? cfg.dayOrder
            : defaultForm.dayOrder,
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

        // Self-heal missing keys by writing normalized form values back to template.
        if (missing.length > 0) {
          await supabase
            .from('templates')
            .update({
              config: {
                ...(cfg || {}),
                ...loadedForm
              },
              updated_by: user?.id || null
            })
            .eq('id', timetable.id)
            .eq('school_id', user.school_id);
          setTemplateMissingFields([]);
        }

        setTimetableForm(loadedForm);
        setEditTimetableForm(loadedForm);
      } else {
        setTemplateMissingFields(requiredTemplateFields);
      }
    } catch (err) {
      console.error('Failed to load templates and permissions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [user?.id, user?.school_id]);

  useEffect(() => {
    if (!user?.school_id) return;

    const channel = supabase
      .channel(`templates-permission-realtime-${user.school_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'templates' }, () => {
        loadTemplates().catch((err) => console.error('Realtime templates refresh failed', err));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'template_permissions' }, () => {
        loadTemplates().catch((err) => console.error('Realtime template permissions refresh failed', err));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.school_id]);

  const permissionByTemplate = useMemo(() => {
    const map = new Map<string, PermissionRow[]>();
    permissions.forEach((row) => {
      const list = map.get(row.template_key) || [];
      list.push(row);
      map.set(row.template_key, list);
    });
    return map;
  }, [permissions]);

  const timetablePermission = useMemo(
    () => permissions.find((row) => row.template_key === 'TIMETABLE_CLASSES' && row.role === currentRole),
    [permissions, currentRole]
  );

  const canEditTemplates = Boolean(timetablePermission?.can_edit);

  const templatesWithoutTimetable = useMemo(() => templates.filter((t) => t.key !== 'TIMETABLE_CLASSES'), [templates]);

  const recordedSpecialItems = useMemo(() => {
    const breakItems = buildBreakTimeline(timetableForm);
    return [...breakItems, ...timetableForm.customEntries];
  }, [timetableForm]);

  const saveTimetableTemplate = async (publish: boolean) => {
    if (!canEditTemplates) return;

    const timetable = templates.find((row) => row.key === 'TIMETABLE_CLASSES');
    if (!timetable) return;

    if (publish) {
      const agreed = window.confirm('Your timetable will be changed to match the new template. Agree or cancel?');
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
          name: 'Timetable and Classes',
          config,
          active: true,
          updated_by: user?.id || null
        })
        .eq('id', timetable.id)
        .eq('school_id', user?.school_id || '');

      setTimetableForm(editTimetableForm);
      setIsEditingTimetable(false);
      alert(publish ? 'Template published successfully.' : 'Template saved successfully.');
      await loadTemplates();
    } catch (err) {
      console.error('Failed to save timetable template', err);
    } finally {
      setSaving(false);
    }
  };

  const addCustomEntry = () => {
    if (!newCustom.name.trim()) return;
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
    if (!canEditTemplates) return;
    const revision = revisions.find((r) => r.id === revisionId);
    const timetable = templates.find((row) => row.key === 'TIMETABLE_CLASSES');
    if (!revision || !timetable) return;

    const agreed = window.confirm('Restore this revision as current template?');
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
        .eq('id', timetable.id)
        .eq('school_id', user?.school_id || '');

      await loadTemplates();
    } catch (err) {
      console.error('Failed restoring revision', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-sm font-semibold text-zinc-500">Loading templates and permissions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-emerald-50 via-amber-50 to-sky-50 p-6 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-200/40 blur-2xl" />
        <div className="absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-amber-200/40 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">Template control center</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Temp;lates and Permision</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">Realtime institutional timetable rules, governance permissions, and revision fallback in one place.</p>
        </div>
      </div>

      <Card title="Timetable and Classes" subtitle="Configure school timing and timetable framework" icon={Clock3} className="border-zinc-200 shadow-sm">
        <div className="space-y-4">
          {templateMissingFields.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2">
                <Badge variant="warning">Template fallback active</Badge>
                <p className="text-xs text-amber-700">Missing keys: {templateMissingFields.join(', ')}</p>
              </div>
              <p className="mt-1 text-[11px] text-amber-700">Fallback values are being used for missing fields until template is saved again.</p>
            </div>
          )}

          {!isEditingTimetable ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <p className="text-xs text-zinc-600"><span className="font-semibold">School starts:</span> {timetableForm.schoolStartTime}</p>
                <p className="text-xs text-zinc-600"><span className="font-semibold">Subject/classes start:</span> {timetableForm.classStartTime}</p>
                <p className="text-xs text-zinc-600"><span className="font-semibold">Subject/classes end:</span> {timetableForm.classEndTime}</p>
                <p className="text-xs text-zinc-600"><span className="font-semibold">School ends:</span> {timetableForm.schoolEndTime}</p>
                <p className="text-xs text-zinc-600"><span className="font-semibold">Minutes per class:</span> {timetableForm.periodMinutes}</p>
                <p className="text-xs text-zinc-600"><span className="font-semibold">Default class label:</span> {timetableForm.defaultClassLabel}</p>
                <p className="text-xs text-zinc-600"><span className="font-semibold">Room prefix:</span> {timetableForm.roomPrefix}</p>
                <p className="text-xs text-zinc-600"><span className="font-semibold">Live slot enforcement:</span> {timetableForm.enforceLiveSlotAlignment ? 'On' : 'Off'}</p>
                <p className="text-xs text-zinc-600"><span className="font-semibold">Subject selection limit:</span> {timetableForm.subjectSelectionLimit}</p>
                <p className="text-xs text-zinc-600"><span className="font-semibold">Fallback stream count:</span> {timetableForm.fallbackStreamCount}</p>
                <p className="text-xs text-zinc-600"><span className="font-semibold">Prefer class-teacher streams:</span> {timetableForm.preferClassTeacherStreams ? 'Yes' : 'No'}</p>
                <p className="text-xs text-zinc-600 md:col-span-2"><span className="font-semibold">Day order:</span> {timetableForm.dayOrder.join(', ')}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-zinc-600">Break settings</p>
                <div className="mt-2 space-y-1">
                  {timetableForm.breaks.length === 0 && <p className="text-xs text-zinc-400">No break rules saved.</p>}
                  {timetableForm.breaks.map((item) => (
                    <p key={item.id} className="text-xs text-zinc-600">{item.label} after period {item.afterPeriods} for {item.durationMinutes} min</p>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-zinc-600">Custom timetable items</p>
                <div className="mt-2 space-y-1">
                  {recordedSpecialItems.length === 0 && <p className="text-xs text-zinc-400">No custom timetable items saved.</p>}
                  {recordedSpecialItems.map((item) => (
                    <p key={item.id} className="text-xs text-zinc-600">{item.name} • {item.type} • {item.startTime} - {item.endTime}</p>
                  ))}
                </div>
              </div>

              <div className="flex justify-end border-t border-zinc-100 pt-3">
                <Button
                  disabled={!canEditTemplates}
                  onClick={() => {
                    setEditTimetableForm(timetableForm);
                    setIsEditingTimetable(true);
                    setTimetableTab('SETTINGS');
                  }}
                >
                  Edit template
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button variant={timetableTab === 'SETTINGS' ? 'primary' : 'outline'} onClick={() => setTimetableTab('SETTINGS')}>Class timing settings</Button>
                <Button variant={timetableTab === 'CUSTOM' ? 'primary' : 'outline'} onClick={() => setTimetableTab('CUSTOM')}>Set up custom on timetable</Button>
              </div>

              {timetableTab === 'SETTINGS' ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">School starts at</label>
                <input type="time" value={editTimetableForm.schoolStartTime} disabled={!canEditTemplates} onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, schoolStartTime: e.target.value }))} className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Subject/classes start at</label>
                <input type="time" value={editTimetableForm.classStartTime} disabled={!canEditTemplates} onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, classStartTime: e.target.value }))} className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Subject/classes end at</label>
                <input type="time" value={editTimetableForm.classEndTime} disabled={!canEditTemplates} onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, classEndTime: e.target.value }))} className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">School ends at</label>
                <input type="time" value={editTimetableForm.schoolEndTime} disabled={!canEditTemplates} onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, schoolEndTime: e.target.value }))} className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Minutes per class</label>
                <input type="number" min={20} max={120} value={editTimetableForm.periodMinutes} disabled={!canEditTemplates} onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, periodMinutes: Math.max(20, Number(e.target.value) || 45) }))} className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Default class label</label>
                <input type="text" value={editTimetableForm.defaultClassLabel} disabled={!canEditTemplates} onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, defaultClassLabel: e.target.value || 'Class' }))} className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Room prefix</label>
                <input type="text" value={editTimetableForm.roomPrefix} disabled={!canEditTemplates} onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, roomPrefix: e.target.value || 'Room' }))} className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Subject selection limit</label>
                <input type="number" min={1} max={20} value={editTimetableForm.subjectSelectionLimit} disabled={!canEditTemplates} onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, subjectSelectionLimit: Math.max(1, Number(e.target.value) || 1) }))} className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Fallback stream count</label>
                <input type="number" min={1} max={10} value={editTimetableForm.fallbackStreamCount} disabled={!canEditTemplates} onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, fallbackStreamCount: Math.max(1, Number(e.target.value) || 1) }))} className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Day order (comma separated)</label>
                <input
                  type="text"
                  value={editTimetableForm.dayOrder.join(',')}
                  disabled={!canEditTemplates}
                  onChange={(e) => {
                    const values = e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean);
                    setEditTimetableForm((prev) => ({ ...prev, dayOrder: values.length > 0 ? values : defaultForm.dayOrder }));
                  }}
                  className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm"
                />
              </div>

              <div className="md:col-span-2 rounded-lg border border-zinc-200 px-3 py-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-700">
                  <input
                    type="checkbox"
                    checked={editTimetableForm.enforceLiveSlotAlignment}
                    disabled={!canEditTemplates}
                    onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, enforceLiveSlotAlignment: e.target.checked }))}
                  />
                  Enforce live sessions to match template class slots exactly
                </label>
                <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-zinc-700">
                  <input
                    type="checkbox"
                    checked={editTimetableForm.preferClassTeacherStreams}
                    disabled={!canEditTemplates}
                    onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, preferClassTeacherStreams: e.target.checked }))}
                  />
                  Prefer class-teacher assigned streams when generating physical rows
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Break rows</label>
                <div className="space-y-2">
                  {editTimetableForm.breaks.length === 0 && <p className="text-xs text-zinc-400">No break rows yet.</p>}
                  {editTimetableForm.breaks.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-200 p-2 md:grid-cols-10">
                      <input
                        className="h-9 rounded-lg border border-zinc-200 px-2 text-xs md:col-span-4"
                        value={item.label}
                        disabled={!canEditTemplates}
                        onChange={(e) => setEditTimetableForm((prev) => ({
                          ...prev,
                          breaks: prev.breaks.map((row) => row.id === item.id ? { ...row, label: e.target.value } : row)
                        }))}
                      />
                      <input
                        type="number"
                        min={1}
                        className="h-9 rounded-lg border border-zinc-200 px-2 text-xs md:col-span-2"
                        value={item.afterPeriods}
                        disabled={!canEditTemplates}
                        onChange={(e) => setEditTimetableForm((prev) => ({
                          ...prev,
                          breaks: prev.breaks.map((row) => row.id === item.id ? { ...row, afterPeriods: Math.max(1, Number(e.target.value) || 1) } : row)
                        }))}
                      />
                      <input
                        type="number"
                        min={5}
                        className="h-9 rounded-lg border border-zinc-200 px-2 text-xs md:col-span-2"
                        value={item.durationMinutes}
                        disabled={!canEditTemplates}
                        onChange={(e) => setEditTimetableForm((prev) => ({
                          ...prev,
                          breaks: prev.breaks.map((row) => row.id === item.id ? { ...row, durationMinutes: Math.max(5, Number(e.target.value) || 5) } : row)
                        }))}
                      />
                      <Button variant="outline" disabled={!canEditTemplates} className="h-9 px-2 md:col-span-2" onClick={() => removeBreakRow(item.id)}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 rounded-lg border border-dashed border-zinc-200 p-2 md:grid-cols-10">
                  <input className="h-9 rounded-lg border border-zinc-200 px-2 text-xs md:col-span-4" placeholder="Break label" value={newBreak.label} disabled={!canEditTemplates} onChange={(e) => setNewBreak((prev) => ({ ...prev, label: e.target.value }))} />
                  <input type="number" min={1} className="h-9 rounded-lg border border-zinc-200 px-2 text-xs md:col-span-2" value={newBreak.afterPeriods} disabled={!canEditTemplates} onChange={(e) => setNewBreak((prev) => ({ ...prev, afterPeriods: Math.max(1, Number(e.target.value) || 1) }))} />
                  <input type="number" min={5} className="h-9 rounded-lg border border-zinc-200 px-2 text-xs md:col-span-2" value={newBreak.durationMinutes} disabled={!canEditTemplates} onChange={(e) => setNewBreak((prev) => ({ ...prev, durationMinutes: Math.max(5, Number(e.target.value) || 5) }))} />
                  <Button variant="outline" disabled={!canEditTemplates} className="h-9 px-2 md:col-span-2" onClick={addBreakRow}>
                    <Plus size={12} />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                <input className="h-10 rounded-lg border border-zinc-200 px-3 text-sm md:col-span-2" placeholder="Title / Name" value={newCustom.name} disabled={!canEditTemplates} onChange={(e) => setNewCustom((prev) => ({ ...prev, name: e.target.value }))} />
                <select className="h-10 rounded-lg border border-zinc-200 px-3 text-sm" value={newCustom.type} disabled={!canEditTemplates} onChange={(e) => setNewCustom((prev) => ({ ...prev, type: e.target.value as TimetableCustomType }))}>
                  <option value="CLASS">Class</option>
                  <option value="ASSEMBLY">Assembly</option>
                  <option value="EXAMS">Exams</option>
                  <option value="BREAKS_LUNCH">Breaks & lunch</option>
                  <option value="CUSTOM">Custom</option>
                </select>
                <input type="time" className="h-10 rounded-lg border border-zinc-200 px-3 text-sm" value={newCustom.startTime} disabled={!canEditTemplates} onChange={(e) => setNewCustom((prev) => ({ ...prev, startTime: e.target.value }))} />
                <input type="time" className="h-10 rounded-lg border border-zinc-200 px-3 text-sm" value={newCustom.endTime} disabled={!canEditTemplates} onChange={(e) => setNewCustom((prev) => ({ ...prev, endTime: e.target.value }))} />
              </div>

              <div className="flex justify-end">
                <Button disabled={!canEditTemplates} onClick={addCustomEntry}><Plus size={14} /> Add custom item</Button>
              </div>

              <div className="space-y-2">
                {editTimetableForm.customEntries.length === 0 && <p className="text-xs text-zinc-400">No custom timetable items yet.</p>}
                {editTimetableForm.customEntries.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2">
                    <p className="text-xs text-zinc-600">{item.name} • {item.type} • {item.startTime} - {item.endTime}</p>
                    <Button variant="outline" disabled={!canEditTemplates} className="h-7 px-2" onClick={() => removeCustomEntry(item.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

              <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-3">
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
                <Button variant="outline" disabled={!canEditTemplates || saving} onClick={() => saveTimetableTemplate(false)}>
                  Save template
                </Button>
                <Button disabled={!canEditTemplates || saving} onClick={() => saveTimetableTemplate(true)}>
                  Release and publish template
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card title="Template Revision Fallback" subtitle="Restore a previous timetable template snapshot" icon={Sparkles} className="border-zinc-200 shadow-sm">
        <div className="space-y-2">
          {revisions.length === 0 && <p className="text-xs text-zinc-400">No revisions found yet.</p>}
          {revisions.map((rev) => (
            <div key={rev.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2">
              <p className="text-xs text-zinc-600">{new Date(rev.changed_at).toLocaleString('en-GB')} • {rev.action}</p>
              <Button variant="outline" disabled={!canEditTemplates || saving} onClick={() => restoreFromRevision(rev.id)}>Restore</Button>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {templatesWithoutTimetable.map((item) => {
          const Icon = TEMPLATE_ICONS[item.key] || Sparkles;
          const perms = permissionByTemplate.get(item.key) || [];
          return (
            <Card key={item.id} title={item.name} subtitle={item.key} icon={Icon}>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={item.active ? 'success' : 'neutral'}>{item.active ? 'Active' : 'Inactive'}</Badge>
                  <Badge variant="info">{item.category}</Badge>
                </div>

                <div className="text-xs text-zinc-600">
                  <p>Managed from database templates in realtime.</p>
                  <p className="mt-1">Updated {new Date(item.updated_at).toLocaleString('en-GB')}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-zinc-600">Role permissions</p>
                  <div className="mt-1 space-y-1">
                    {perms.length === 0 && <p className="text-xs text-zinc-400">No permissions rows yet.</p>}
                    {perms.map((perm, idx) => (
                      <p key={`${perm.template_key}-${perm.role}-${idx}`} className="text-xs text-zinc-500">
                        {perm.role}: view={String(perm.can_view)} use={String(perm.can_use)} edit={String(perm.can_edit)}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
